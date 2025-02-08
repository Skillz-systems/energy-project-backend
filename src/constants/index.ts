export const MESSAGES = {
  // Success Messages
  CREATED: 'The Record has been created successfully',
  UPDATED: 'The Record has been updated successfully',
  DELETED: 'The Record has been deleted successfully',
  INVENTORY_CREATED: 'Inventory created successfully',
  PWD_RESET_SUCCESS: 'Password Successfully updated',
  PASSWORD_CHANGED_SUCCESS: 'Password Successfully updated',
  PWD_CREATION_SUCCESS: 'Password Successfully created',
  PWD_RESET_MAIL_SENT: 'A password reset link has been sent to your mail',
  TOKEN_VALID: 'Token is valid',

  // Error Messages
  EMAIL_EXISTS: 'Email already exists',
  DEVICE_EXISTS: 'Device with serial number already exist',
  USERNAME_IN_USE: 'Username already in use',
  USERNAME_INVALID: 'Invalid username',
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  PASSWORD_TOO_WEAK: 'Password is too weak',
  PWD_SIMILAR_TO_OLD: 'New password should not be the same as old password',
  USER_NOT_FOUND: 'User not found',
  BATCH_NOT_FOUND: 'Batch not found',
  DEVICE_NOT_FOUND: 'Device not found',
  INVALID_TOKEN: 'Invalid or expired token',
  NOT_PERMITTED:
    "You don't have sufficient permissions to perform the necessary action",
  ROLE_NOT_FOUND: 'Role not found',
  ROLES_METADATA_INVALID: 'Roles metadata is invalid or missing',
  PERMISSIONS_METADATA_INVALID: 'Permissions metadata is invalid or missing',
  EMPTY_OBJECT: 'At least one field must be provided to update',

  PRODUCT_NOT_FOUND: 'Product not found',
  INVENTORY_NOT_FOUND: 'Inventory not found',
  AGENT_NOT_FOUND: 'Agent not found',

  /**
   *
   * @param field
   * @returns `Invalid ${field}`
   */
  customInvalidMsg(field: string) {
    return `Invalid ${field}`;
  },
};
