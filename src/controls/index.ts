import type { Cheerio } from 'cheerio';
import type { SapWdaClient } from '../core/client';
import { SapButton } from './SapButton';
import { SapComboBox } from './SapComboBox';
import { SapControl } from './SapControl';
import { SapInput } from './SapInput';
import { SapTable } from './SapTable';

export * from './SapButton';
export * from './SapComboBox';
export * from './SapControl';
export * from './SapInput';
export * from './SapTable';

const ControlRegistry: Record<string, new (el: Cheerio<any>, client: SapWdaClient) => SapControl> = {
    'B': SapButton,
    'I': SapInput,
    'CO': SapComboBox,
    'CB': SapComboBox,
    'TV': SapTable,
    'ST': SapTable
};

/**
 * Empty Generic Control as fallback wrapper.
 */
class GenericControl extends SapControl { }

/**
 * Controller instantiator logic for identifying appropriate Wrapper class instances.
 * @param el The Cheerio element representing the targeted SAP interaction node.
 * @param client Orchestrator binding representation client context.
 * @returns An instantiated generic boundary.
 */
export function createControl(el: Cheerio<any>, client: SapWdaClient): SapControl {
    const ct = el.attr('ct') || '';
    const ControlClass = ControlRegistry[ct] || GenericControl;
    return new ControlClass(el, client);
}

/**
 * Systemic scaling method exposing dynamic structural additions to supported controls list.
 * @param ct Base control marker corresponding to standard definition mapping.
 * @param controlClass Wrapper instance conforming to standard `SapControl` structure.
 */
export function registerControl(ct: string, controlClass: new (el: Cheerio<any>, client: SapWdaClient) => SapControl): void {
    ControlRegistry[ct] = controlClass;
}
