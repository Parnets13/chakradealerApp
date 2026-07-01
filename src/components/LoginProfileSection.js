import React from 'react';
import RequirementCard from './RequirementCard';
import {dealerModules} from './dealerModules';

function LoginProfileSection() {
  return <RequirementCard module={dealerModules[0]} />;
}

export default LoginProfileSection;
