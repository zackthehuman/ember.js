import { InternalHelperReference } from '../utils/references';

export const COMPONENT_HELPER_SYMBOL = 'ba564e81-ceda-4475-84a7-1c44f1c42c0e';

export function isClosureComponentRef(ref) {
  return !!ref[COMPONENT_HELPER_SYMBOL];
}

class ComponentHelperReference extends InternalHelperReference {
  constructor() {
    super(...arguments);
    this['ba564e81-ceda-4475-84a7-1c44f1c42c0e'] = true;
  }
}

function componentHelper(args) {
  return { args };
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new ComponentHelperReference(componentHelper, args);
  }
};
