import React from 'react';
import { AccessControlHub } from '../access/AccessControlHub';

/**
 * AccessControlManagement legacy wrapper.
 * Directly routes to the unified AccessControlHub with 'roles' tab.
 */
export const AccessControlManagement: React.FC = () => {
  return <AccessControlHub activeTab="roles" />;
};

export default AccessControlManagement;
