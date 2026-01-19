// Input validation utilities

const VALID_INJECTION_SITES = ['Stomach', 'Thigh', 'Arm', 'None'];
const VALID_INJECTION_SIDES = ['Left', 'Right', 'None'];
const VALID_SIDE_EFFECTS = ['Nausea', 'Fatigue', 'Headache', 'Dizziness', 'Constipation', 'Diarrhea', 'Injection Site Reaction'];

export interface ValidationError {
  field: string;
  message: string;
}

export interface EntryInput {
  id?: string;
  date: string;
  weight: number;
  dosage: number;
  injectionSite?: string;
  injectionSide?: string;
  sideEffects?: string[];
  notes?: string;
  createdAt?: number;
}

export interface ProfileInput {
  heightInches: number;
  targetWeight: number;
  name?: string;
}

function isValidUUID(str: string): boolean {
  return /^[a-z0-9-]{1,50}$/i.test(str);
}

function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

function sanitizeString(str: string, maxLength: number): string {
  return str.slice(0, maxLength).trim();
}

export function validateEntry(input: unknown): { valid: true; data: EntryInput } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }

  const data = input as Record<string, unknown>;

  // id (optional)
  if (data.id !== undefined) {
    if (typeof data.id !== 'string' || !isValidUUID(data.id)) {
      errors.push({ field: 'id', message: 'Invalid id format' });
    }
  }

  // date (required)
  if (typeof data.date !== 'string' || !isValidDate(data.date)) {
    errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' });
  }

  // weight (required)
  if (typeof data.weight !== 'number' || data.weight <= 0 || data.weight > 1000) {
    errors.push({ field: 'weight', message: 'Weight must be a positive number up to 1000' });
  }

  // dosage (required)
  if (typeof data.dosage !== 'number' || data.dosage < 0 || data.dosage > 50) {
    errors.push({ field: 'dosage', message: 'Dosage must be between 0 and 50' });
  }

  // injectionSite (optional)
  if (data.injectionSite !== undefined && data.injectionSite !== null) {
    if (typeof data.injectionSite !== 'string' || !VALID_INJECTION_SITES.includes(data.injectionSite)) {
      errors.push({ field: 'injectionSite', message: `Injection site must be one of: ${VALID_INJECTION_SITES.join(', ')}` });
    }
  }

  // injectionSide (optional)
  if (data.injectionSide !== undefined && data.injectionSide !== null) {
    if (typeof data.injectionSide !== 'string' || !VALID_INJECTION_SIDES.includes(data.injectionSide)) {
      errors.push({ field: 'injectionSide', message: `Injection side must be one of: ${VALID_INJECTION_SIDES.join(', ')}` });
    }
  }

  // sideEffects (optional array)
  if (data.sideEffects !== undefined && data.sideEffects !== null) {
    if (!Array.isArray(data.sideEffects)) {
      errors.push({ field: 'sideEffects', message: 'Side effects must be an array' });
    } else if (data.sideEffects.length > 10) {
      errors.push({ field: 'sideEffects', message: 'Too many side effects' });
    } else {
      const invalidEffects = data.sideEffects.filter(e => typeof e !== 'string' || !VALID_SIDE_EFFECTS.includes(e));
      if (invalidEffects.length > 0) {
        errors.push({ field: 'sideEffects', message: `Invalid side effects. Valid options: ${VALID_SIDE_EFFECTS.join(', ')}` });
      }
    }
  }

  // notes (optional)
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    } else if (data.notes.length > 1000) {
      errors.push({ field: 'notes', message: 'Notes must be 1000 characters or less' });
    }
  }

  // createdAt (optional)
  if (data.createdAt !== undefined && data.createdAt !== null) {
    if (typeof data.createdAt !== 'number' || data.createdAt < 0) {
      errors.push({ field: 'createdAt', message: 'Invalid createdAt timestamp' });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      id: data.id as string | undefined,
      date: data.date as string,
      weight: data.weight as number,
      dosage: data.dosage as number,
      injectionSite: data.injectionSite as string | undefined,
      injectionSide: data.injectionSide as string | undefined,
      sideEffects: data.sideEffects as string[] | undefined,
      notes: data.notes ? sanitizeString(data.notes as string, 1000) : undefined,
      createdAt: data.createdAt as number | undefined
    }
  };
}

export function validateProfile(input: unknown): { valid: true; data: ProfileInput } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }

  const data = input as Record<string, unknown>;

  // heightInches (required)
  if (typeof data.heightInches !== 'number' || data.heightInches < 12 || data.heightInches > 108) {
    errors.push({ field: 'heightInches', message: 'Height must be between 12 and 108 inches' });
  }

  // targetWeight (required)
  if (typeof data.targetWeight !== 'number' || data.targetWeight <= 0 || data.targetWeight > 1000) {
    errors.push({ field: 'targetWeight', message: 'Target weight must be a positive number up to 1000' });
  }

  // name (optional)
  if (data.name !== undefined && data.name !== null) {
    if (typeof data.name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string' });
    } else if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be 100 characters or less' });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      heightInches: data.heightInches as number,
      targetWeight: data.targetWeight as number,
      name: data.name ? sanitizeString(data.name as string, 100) : undefined
    }
  };
}

export function validateIds(ids: unknown): { valid: true; data: string[] } | { valid: false; message: string } {
  if (!Array.isArray(ids)) {
    return { valid: false, message: 'ids must be an array' };
  }

  if (ids.length === 0) {
    return { valid: false, message: 'ids array cannot be empty' };
  }

  if (ids.length > 100) {
    return { valid: false, message: 'Cannot delete more than 100 entries at once' };
  }

  const allValid = ids.every(id => typeof id === 'string' && isValidUUID(id));
  if (!allValid) {
    return { valid: false, message: 'All ids must be valid strings' };
  }

  return { valid: true, data: ids as string[] };
}
