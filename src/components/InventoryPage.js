/**
 * InventoryPage.js — Dealer App
 *
 * Multi-API Stock Screen:
 *  1. /inventory/stock         → base list (immediate render)
 *  2. /inventory-data/batches  → batch data     ┐
 *  3. /inventory-data/storage  → zone/rack/bin  │ parallel, background
 *  4. /inventory-data/pincode  → pincode info   │ loaded after base list
 *  5. /inventory-data/ageing   → ageing days    │ cards show skeleton
 *  6. /defective-stock         → good/defective │ then update
 *
 * All 6 responses are joined by SKU on the App side.
 * Backend code is NOT changed.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, shadow } from './theme';
import inventoryService from './services/inventoryService';

// ─── helpers ────────────────────────────────────────────────────────────────

const normSku = (v) => String(v || '').trim().toUpperCase();

/** Build lookup maps keyed by normalised SKU from background API responses */
function buildLookups({ batches, storage, pincode, ageing, defective }) {
  // ── Batch map: sku → { batchNo, mfg, exp }
  // /api/batches returns raw Batch docs: { batchNo, sku, mfgDate, expiryDate, ... }
  const batchMap = {};
  (batches?.data || []).forEach((b) => {
    const key = normSku(b.sku);
    if (!key) return;

    // /api/batches → raw doc fields: batchNo, mfgDate, expiryDate
    // /api/inventory-data/batches → mapped fields: batch(=batchNumber!), mfg, exp
    const no = b.batchNo || b.batch || b.batchNumber || b.batchId || '';

    // Format dates if they are ISO strings
    const fmtDate = (d) => {
      if (!d) return '—';
      try {
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
      } catch { return String(d); }
    };

    const mfg = b.mfg || fmtDate(b.mfgDate);
    const exp = b.exp || fmtDate(b.expiryDate);

    if (!batchMap[key]) {
      batchMap[key] = { batchNo: no || '—', mfg, exp };
    }
  });

  // ── Storage map — TWO keys per warehouse so we match regardless of format:
  //   1. warehouseId (e.g. "WH-01")
  //   2. warehouse name (e.g. "Main Warehouse")
  // InventoryItem.warehouse is a plain string — could be either format.
  const storageMap = {};
  (storage?.data || []).forEach((wh) => {
    // wh.id = warehouseId, wh.name = human name
    const idKey   = normSku(wh.id);
    const nameKey = normSku(wh.name);
    // First zone name is the zone label (e.g. "Zone A — Raw Materials")
    // Extract just the zone letter / short label
    const rawZoneName = wh.zones?.[0]?.name || '';
    // Try to pull "Zone A" out of "Zone A — Raw Materials"
    const zoneShort = rawZoneName.split('—')[0].trim() || rawZoneName || '—';
    const entry = { zone: zoneShort, rack: '—', bin: '—' };
    if (idKey)   storageMap[idKey]   = entry;
    if (nameKey) storageMap[nameKey] = entry;
  });

  // ── Pincode map: sku → { pincode, city }
  // Pincode data is from Inventory collection (different from InventoryItem).
  // Locations inside godowns have sku, loc (zone/rack/bin string).
  const pincodeMap = {};
  const locationFromPincodeMap = {}; // sku → loc string like "Zone A > Rack 1 > Bin 5"
  (pincode?.data || []).forEach((p) => {
    (p.godowns || []).forEach((g) => {
      (g.locations || []).forEach((loc) => {
        const key = normSku(loc.sku);
        if (!key) return;
        if (!pincodeMap[key]) {
          pincodeMap[key] = { pincode: p.pincode || '—', city: p.city || '' };
        }
        // Also capture the storage location string from pincode data
        if (!locationFromPincodeMap[key] && loc.loc && loc.loc !== 'N/A') {
          locationFromPincodeMap[key] = loc.loc; // e.g. "Zone A > Rack 1 > Bin 5"
        }
      });
    });
  });

  // ── Ageing map: sku → { days, bucket }
  const ageingMap = {};
  (ageing?.data || []).forEach((a) => {
    const key = normSku(a.sku);
    if (key) ageingMap[key] = { days: a.days ?? null, bucket: a.bucket || '—' };
  });

  // ── Defective map: sku → defectiveQty
  // /defective-stock returns DefectiveStock model items: { sku, qty, ... }
  // /inventory-data/defective returns items where location.zone === 'Defective': { sku, qty, ... }
  const defectiveMap = {};
  (defective?.data || []).forEach((d) => {
    const key = normSku(d.sku);
    if (!key) return;
    const qty = Number(d.qty || d.quantity || d.defectiveQuantity || 0);
    if (!defectiveMap[key]) {
      defectiveMap[key] = { defectiveQty: qty };
    } else {
      // Sum up if multiple records exist for same SKU
      defectiveMap[key].defectiveQty += qty;
    }
  });

  console.log('[buildLookups] batchMap keys:', Object.keys(batchMap).slice(0, 5));
  console.log('[buildLookups] pincodeMap keys:', Object.keys(pincodeMap).slice(0, 5));
  console.log('[buildLookups] locationFromPincodeMap keys:', Object.keys(locationFromPincodeMap).slice(0, 5));
  console.log('[buildLookups] storageMap keys:', Object.keys(storageMap).slice(0, 5));
  console.log('[buildLookups] ageingMap keys:', Object.keys(ageingMap).slice(0, 5));

  return { batchMap, storageMap, pincodeMap, locationFromPincodeMap, ageingMap, defectiveMap };
}

/** Merge background-lookup data onto a base item */
function mergeItem(item, lookups) {
  const key = normSku(item.sku);
  const { batchMap, storageMap, pincodeMap, locationFromPincodeMap, ageingMap, defectiveMap } = lookups;

  // ── BATCH ─────────────────────────────────────────────────────────────────
  // Priority: batchMap[sku] → item.batch (raw field from InventoryItem)
  const batchEntry  = batchMap[key] || null;
  const batchNo     = batchEntry?.batchNo || item.batch || null;
  const batchMfg    = batchEntry?.mfg  || null;
  const batchExp    = batchEntry?.exp  || null;

  // ── LOCATION ──────────────────────────────────────────────────────────────
  // Priority:
  //   1. locationFromPincodeMap[sku]  → real per-item "Zone A > Rack 1 > Bin 5" from Inventory
  //   2. storageMap[warehouseId/name] → warehouse-level zone (static fallback)
  //   3. item.rawLocation             → InventoryItem.location plain string
  const pincodeLocStr = locationFromPincodeMap[key] || null;
  const whKey         = normSku(item.warehouse);
  const whNameKey     = normSku(item.warehouseName);
  const storageLoc    = storageMap[whKey] || storageMap[whNameKey] || null;

  let zone = null;
  let rack = null;
  let bin  = null;

  if (pincodeLocStr) {
    // "Zone A > Rack 1 > Bin 5" or "Zone A > Rack 1 > Shelf 2 > Bin 5"
    pincodeLocStr.split('>').map(s => s.trim()).forEach(p => {
      const l = p.toLowerCase();
      if      (l.startsWith('zone')) zone = zone || p;
      else if (l.startsWith('rack')) rack = rack || p;
      else if (l.startsWith('bin'))  bin  = bin  || p;
    });
  }

  // Fallback to storage zone if pincode gave nothing
  if (!zone && storageLoc?.zone) zone = storageLoc.zone;

  // Fallback to raw location string from InventoryItem
  if (!zone && item.rawLocation) {
    const raw = String(item.rawLocation).trim();
    if (raw && raw !== 'N/A') {
      // Try splitting by common delimiters
      raw.split(/[>/|,]/).map(s => s.trim()).filter(Boolean).forEach(p => {
        const l = p.toLowerCase();
        if      (l.startsWith('zone')) zone = zone || p;
        else if (l.startsWith('rack')) rack = rack || p;
        else if (l.startsWith('bin'))  bin  = bin  || p;
      });
      // If still nothing parsed, show rawLocation as zone
      if (!zone) zone = raw;
    }
  }

  // ── PINCODE ───────────────────────────────────────────────────────────────
  const pincodeEntry = pincodeMap[key] || null;

  // ── AGEING ────────────────────────────────────────────────────────────────
  const ageing = ageingMap[key] || null;

  // ── DEFECTIVE ─────────────────────────────────────────────────────────────
  const defective = defectiveMap[key] || null;
  const defQty    = defective?.defectiveQty ?? null;
  const goodQty   = defQty != null ? Math.max(0, (item.qty || 0) - defQty) : null;

  return {
    ...item,
    batchNo,
    batchMfg,
    batchExp,
    zone,
    rack,
    bin,
    pincode:      pincodeEntry?.pincode ?? null,
    pincodeCity:  pincodeEntry?.city    ?? null,
    ageingDays:   ageing?.days    ?? null,
    ageingBucket: ageing?.bucket  ?? null,
    goodQty,
    defectiveQty: defQty,
  };
}

// ─── Location string builder ─────────────────────────────────────────────────
function buildLocation(item) {
  const parts = [];
  if (item.zone && item.zone !== '—') parts.push(item.zone);
  if (item.rack && item.rack !== '—') parts.push(item.rack);
  if (item.bin  && item.bin  !== '—') parts.push(item.bin);
  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusStyle(adminStatus) {
  if (adminStatus === 'Dead')
    return { displayStatus: 'Out of Stock', statusColor: '#E53E3E' };
  if (adminStatus === 'Critical')
    return { displayStatus: 'Low Stock', statusColor: '#DD6B20' };
  return { displayStatus: 'In Stock', statusColor: '#38A169' };
}

function getBorderColor(adminStatus) {
  if (adminStatus === 'Dead') return '#E53E3E';
  if (adminStatus === 'Critical') return '#DD6B20';
  return '#38A169';
}

// ─── Skeleton line component ─────────────────────────────────────────────────

function SkeletonLine({ w = '70%', h = 11, mt = 0 }) {
  return (
    <View
      style={{
        height: h,
        width: w,
        borderRadius: 4,
        backgroundColor: '#E8ECEC',
        marginTop: mt,
      }}
    />
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ item, extraLoading }) {
  const { displayStatus, statusColor } = getStatusStyle(item.adminStatus);
  const borderColor = getBorderColor(item.adminStatus);

  const hasCategory = !!item.category;
  const catDisplay = hasCategory ? item.category : '—';

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      {/* ── Header: name + SKU ── */}
      <View style={styles.cardHeader}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name || 'Unknown Item'}
        </Text>
        <View style={styles.skuChip}>
          <Text style={styles.skuText}>{item.sku || 'N/A'}</Text>
        </View>
      </View>

      {/* ── Category ── */}
      <DetailRow icon="folder-outline" label="Category" value={catDisplay} />

      {/* ── Warehouse ── */}
      <DetailRow
        icon="warehouse"
        label="Warehouse"
        value={item.warehouseName || item.warehouse || '—'}
      />

      {/* ── Location (zone/rack/bin) — skeleton while loading ── */}
      {extraLoading ? (
        <SkeletonRow icon="map-marker-outline" label="Location" />
      ) : (
        <DetailRow
          icon="map-marker-outline"
          label="Location"
          value={buildLocation(item)}
        />
      )}

      {/* ── Pincode ── skeleton while loading ── */}
      {extraLoading ? (
        <SkeletonRow icon="map" label="Pincode" />
      ) : (
        <DetailRow
          icon="map"
          label="Pincode"
          value={
            item.pincode
              ? item.pincodeCity
                ? `${item.pincode} · ${item.pincodeCity}`
                : item.pincode
              : '—'
          }
        />
      )}

      {/* ── Qty + min qty ── */}
      <View style={styles.qtyRow}>
        <Icon name="package-variant" size={15} color={colors.muted} />
        <Text style={styles.detailLabel}>Qty :</Text>
        <Text style={[styles.detailValue, { color: colors.text, fontWeight: '800' }]}>
          {(item.qty || 0).toLocaleString('en-IN')}
        </Text>
        {item.minQuantity != null && (
          <Text style={[styles.detailValue, { color: colors.muted }]}>
            {'  '}(Min: {item.minQuantity})
          </Text>
        )}
      </View>



      {/* ── Batch ── skeleton while loading ── */}
      {extraLoading ? (
        <SkeletonRow icon="barcode" label="Batch No" />
      ) : (
        <DetailRow
          icon="barcode"
          label="Batch No"
          value={
            item.batchNo
              ? item.batchExp
                ? `${item.batchNo}  (Exp: ${item.batchExp})`
                : item.batchNo
              : '—'
          }
        />
      )}

      {/* ── Ageing — skeleton while loading ── */}
      {extraLoading ? (
        <SkeletonRow icon="timer-outline" label="Ageing" />
      ) : (
        <DetailRow
          icon="timer-outline"
          label="Ageing"
          value={
            item.ageingDays != null
              ? `${item.ageingDays} days${item.ageingBucket ? ` (${item.ageingBucket})` : ''}`
              : '—'
          }
        />
      )}

      {/* ── Status badge ── */}
      <View style={styles.statusRow}>
        <Text style={styles.detailLabel}>Status :</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {displayStatus}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Small helper components ─────────────────────────────────────────────────

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={15} color={colors.muted} />
      <Text style={styles.detailLabel}>{label} :</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SkeletonRow({ icon, label }) {
  return (
    <View style={[styles.row, { alignItems: 'center' }]}>
      <Icon name={icon} size={15} color="#D0DADA" />
      <Text style={[styles.detailLabel, { color: '#C0CCCC' }]}>{label} :</Text>
      <SkeletonLine w="45%" h={10} />
    </View>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ value, label, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Filter tab button ────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'All',      label: 'All',      activeColor: colors.red },
  { key: 'Active',   label: 'Active',   activeColor: '#38A169' },
  { key: 'Critical', label: 'Critical', activeColor: '#DD6B20' },
  { key: 'Dead',     label: 'Dead',     activeColor: '#E53E3E' },
];

function FilterTab({ item, active, onPress }) {
  const isActive = active === item.key;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterTab,
        isActive && { backgroundColor: item.activeColor, borderColor: item.activeColor },
      ]}>
      <Text
        style={[
          styles.filterTabText,
          { color: isActive ? '#FFF' : colors.text },
        ]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InventoryPage({ onBack }) {
  // ── base data (immediate) ──
  const [baseItems, setBaseItems]   = useState([]);   // raw from /inventory/stock
  const [mergedItems, setMergedItems] = useState([]); // after merging lookups
  const [stats, setStats]           = useState({ totalSKU: 0, critical: 0, warehouses: 0, totalUnits: 0 });
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError]   = useState(null);

  // ── extra data (background) ──
  const [lookups, setLookups]       = useState(null);  // null = not loaded yet
  const [extraLoading, setExtraLoading] = useState(true);

  // ── filter / search ──
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery]   = useState('');

  // ── Abort guard ──
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── STEP 1: fetch base list ───────────────────────────────────────────────

  const fetchBase = useCallback(async () => {
    setBaseLoading(true);
    setBaseError(null);
    try {
      const res = await inventoryService.getInventoryStock();
      if (!mountedRef.current) return;

      if (!res?.success) throw new Error(res?.message || 'Failed to load inventory');

      const items = (res.data || []).map((item, i) => {
        const { displayStatus, statusColor } = getStatusStyle(item.status);

        // Warehouse: InventoryItem.warehouse is a plain string (name or ID)
        // Also try warehouseName if present (Inventory model populates this)
        const warehouseStr  = item.warehouse     || '';
        const warehouseName = item.warehouseName || warehouseStr;

        // Category: may be populated object or plain string
        let catName = null;
        if (item.category && typeof item.category === 'object') {
          catName = item.category.name || null;
        } else if (typeof item.category === 'string' && item.category.length > 0) {
          catName = item.category;
        }

        return {
          id: item._id || item.id || `item-${i}`,
          name: item.name || item.itemName || item.sku || 'Unknown',
          sku: item.sku || item.itemCode || `ITEM-${i}`,
          qty: Number(item.qty || item.currentQuantity || 0),
          warehouse:    warehouseStr,
          warehouseName,
          category:     catName,
          minQuantity:  item.minQty || item.minQuantity || null,
          // Keep raw batch field from base item as fallback
          batch:        item.batch || null,
          // Keep raw location from InventoryItem as fallback (plain string like "Zone A / Rack 1")
          rawLocation:  item.location || null,
          adminStatus:  item.status || 'Active',
          displayStatus,
          statusColor,
          // extra fields — null until background load fills them
          batchNo:      null,
          batchMfg:     null,
          batchExp:     null,
          zone:         null,
          rack:         null,
          bin:          null,
          pincode:      null,
          pincodeCity:  null,
          ageingDays:   null,
          ageingBucket: null,
          goodQty:      null,
          defectiveQty: null,
        };
      });

      const st = res.statistics || {};
      setStats({
        totalSKU:   st.totalSKU   ?? items.length,
        critical:   st.criticalItems ?? items.filter(x => x.adminStatus === 'Critical').length,
        warehouses: st.warehouses ?? 0,
        totalUnits: st.totalUnits ?? items.reduce((s, x) => s + x.qty, 0),
      });

      setBaseItems(items);
      setMergedItems(items); // show base immediately while extra loads
    } catch (err) {
      if (mountedRef.current) setBaseError(err.message || 'Failed to load inventory');
    } finally {
      if (mountedRef.current) setBaseLoading(false);
    }
  }, []);

  // ── STEP 2: fetch all 5 extra APIs in parallel ────────────────────────────

  const fetchExtra = useCallback(async () => {
    setExtraLoading(true);
    try {
      const [batches, storage, pincode, ageing, defective] = await Promise.allSettled([
        inventoryService.getBatches(),
        inventoryService.getStorageLocations(),
        inventoryService.getPincodeStock(),
        inventoryService.getAgeingStock(),
        inventoryService.getDefectiveStock(),
      ]);

      if (!mountedRef.current) return;

      const safeVal = (r) => (r.status === 'fulfilled' ? r.value : { success: false, data: [] });

      const newLookups = buildLookups({
        batches:   safeVal(batches),
        storage:   safeVal(storage),
        pincode:   safeVal(pincode),
        ageing:    safeVal(ageing),
        defective: safeVal(defective),
      });

      setLookups(newLookups);
    } catch (err) {
      console.warn('[InventoryPage] Extra fetch error:', err.message);
    } finally {
      if (mountedRef.current) setExtraLoading(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Fetch base first, then kick off background load regardless of result
    fetchBase().finally(() => {
      if (mountedRef.current) fetchExtra();
    });
  }, [fetchBase, fetchExtra]);

  // ── Merge extra data into items whenever lookups arrive ───────────────────

  useEffect(() => {
    if (!lookups || baseItems.length === 0) return;
    const merged = baseItems.map((item) => mergeItem(item, lookups));
    setMergedItems(merged);
  }, [lookups, baseItems]);

  // ── Full refresh ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setLookups(null);
    setExtraLoading(true);
    await fetchBase();
    if (mountedRef.current) fetchExtra();
  }, [fetchBase, fetchExtra]);

  // ── Filtering / searching ─────────────────────────────────────────────────

  const displayed = mergedItems.filter((item) => {
    // status filter
    if (activeFilter !== 'All' && item.adminStatus !== activeFilter) return false;
    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.sku.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────

  if (baseLoading) {
    return (
      <View style={styles.container}>
        <TopBar onBack={onBack} onRefresh={handleRefresh} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loadingText}>Loading inventory…</Text>
        </View>
      </View>
    );
  }

  if (baseError) {
    return (
      <View style={styles.container}>
        <TopBar onBack={onBack} onRefresh={handleRefresh} />
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={52} color={colors.red} />
          <Text style={styles.errorText}>{baseError}</Text>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top nav ── */}
      <TopBar onBack={onBack} onRefresh={handleRefresh} />

      {/* ── Search ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search SKU or item name…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter tabs — equal width, same height ── */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <FilterTab
            key={tab.key}
            item={tab}
            active={activeFilter}
            onPress={() => setActiveFilter(tab.key)}
          />
        ))}
      </View>

      {/* ── Summary stats ── */}
      <View style={styles.statsRow}>
        <StatCard value={String(stats.totalSKU)}    label="Total SKU"      color={colors.red}    />
        <StatCard value={String(stats.critical)}    label="Critical"       color="#DD6B20"       />
        <StatCard value={String(stats.warehouses)}  label="Warehouses"     color="#38A169"       />
        <StatCard value={String(stats.totalUnits)}  label="Total Units"    color="#E53E3E"       />
      </View>

      {/* ── Background load indicator ── */}
      {extraLoading && (
        <View style={styles.extraLoadBanner}>
          <ActivityIndicator size="small" color={colors.red} />
          <Text style={styles.extraLoadText}>
            Loading batch, location & ageing data…
          </Text>
        </View>
      )}

      {/* ── Product list ── */}
      {displayed.length === 0 ? (
        <View style={styles.center}>
          <Icon name="package-variant-off" size={52} color={colors.muted} />
          <Text style={styles.emptyText}>
            {mergedItems.length === 0
              ? 'No inventory items found'
              : 'No items match the current filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard item={item} extraLoading={extraLoading} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={10}
        />
      )}
    </View>
  );
}

// ─── Top nav bar ─────────────────────────────────────────────────────────────

function TopBar({ onBack, onRefresh }) {
  return (
    <View style={styles.topNav}>
      <Pressable onPress={onBack} style={styles.navBtn}>
        <Icon name="arrow-left" size={24} color="#FFF" />
      </Pressable>
      <View style={styles.topNavCenter}>
        <Text style={styles.topNavTitle}>Inventory</Text>
        <Icon name="package-variant" size={22} color="#FFF" />
      </View>
      <Pressable onPress={onRefresh} style={styles.navBtn}>
        <Icon name="refresh" size={24} color="#FFF" />
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // top nav
  topNav: {
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  topNavCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  topNavTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },

  // search
  searchSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, backgroundColor: '#FFF' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F7F7', borderRadius: 12,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: colors.line,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 8 },

  // filter tabs — equal width, same height, no scroll
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5F7F7',
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10,
    paddingTop: 4, backgroundColor: '#FFF', gap: 8,
  },
  statBox: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: colors.line, ...shadow,
  },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // extra load banner
  extraLoadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: '#FFF9F0', borderBottomWidth: 1, borderBottomColor: '#FDECC8',
  },
  extraLoadText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  // list
  listContent: { padding: 14, paddingTop: 8 },

  // card
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.line,
    borderLeftWidth: 5, ...shadow,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  itemName: { color: colors.text, fontSize: 15, fontWeight: '900', flex: 1, marginRight: 8 },
  skuChip: {
    backgroundColor: '#F0F4F4', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  skuText: { color: colors.muted, fontSize: 10, fontWeight: '700' },

  // rows inside card
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 5, flexWrap: 'wrap' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 5 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  detailValue: { color: colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1 },

  // status
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '900' },

  // misc
  loadingText: { marginTop: 14, color: colors.muted, fontSize: 15, fontWeight: '500' },
  errorText: { marginTop: 14, color: colors.red, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptyText: { marginTop: 14, color: colors.muted, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: colors.red,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
  },
  retryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
