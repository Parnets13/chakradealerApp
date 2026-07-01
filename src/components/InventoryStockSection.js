import React from 'react';
import RequirementCard from './RequirementCard';
import {dealerModules} from './dealerModules';

function InventoryStockSection() {
  return <RequirementCard module={dealerModules[2]} />;
}

export default InventoryStockSection;
