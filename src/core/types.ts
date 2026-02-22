/**
 * Model representing the result of a dispatched SAP WDA event.
 */
export interface SapEventResult {
  /**
   * Determines whether the delta update application succeeded for normal DOM responses.
   */
  isSuccess: boolean;

  /**
   * The target URL to open in a new window/tab, if the server dispatched
   * an `openExternalWindow` script action.
   */
  newWindowUrl?: string;
}
