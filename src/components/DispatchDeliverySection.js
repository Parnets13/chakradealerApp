import React from 'react';
import RequirementCard from './RequirementCard';
import {dealerModules} from './dealerModules';

function DispatchDeliverySection() {
  return <RequirementCard module={dealerModules[3]} />;
}

export default DispatchDeliverySection;
