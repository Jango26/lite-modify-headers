/*
 * Configuration model and its conversion to declarativeNetRequest rules.
 * Pure functions only : no chrome API, no DOM, so this stays testable.
 */

export const CONFIG_FORMAT_VERSION = '3.1';

export type RuleAction = 'set' | 'delete' | 'block';
export type RuleTarget = 'req' | 'res';
export type RuleStatus = 'on' | 'off';

export interface Rule {
    status: RuleStatus;
    /* Free form label, only there to remind the user what the rule is for. */
    name: string;
    apply_on: RuleTarget;
    action: RuleAction;
    header_name: string;
    header_value: string;
    url_filter: string;
}

/*
 * A header inside a group has no name and no url filter of its own : the group
 * holds both and shares them with all of its headers. Blocking is about a URL
 * rather than a header, so a group cannot block.
 */
export type GroupHeaderAction = Exclude<RuleAction, 'block'>;

export interface GroupHeader {
    /*
     * Stable identity, only used by the configuration page as a React key.
     * Positions shift when a line is inserted, moved or removed, and a
     * position based key makes React reuse a DOM node for another line, which
     * replays the toggle transitions on every neighbour.
     */
    id: string;
    status: RuleStatus;
    apply_on: RuleTarget;
    action: GroupHeaderAction;
    header_name: string;
    header_value: string;
}

export interface RuleItem extends Rule {
    kind: 'rule';
    id: string;
}

export interface GroupItem {
    kind: 'group';
    id: string;
    status: RuleStatus;
    name: string;
    url_filter: string;
    headers: GroupHeader[];
}

/*
 * The configuration is one flat list of standalone rules and groups so both
 * can be reordered against each other : the order is what sets the priority.
 */
export type ConfigItem = RuleItem | GroupItem;

export interface Config {
    format_version: string;
    debug_mode: boolean;
    items: ConfigItem[];
}

const ALL_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
    'main_frame',
    'sub_frame',
    'stylesheet',
    'script',
    'image',
    'font',
    'object',
    'xmlhttprequest',
    'ping',
    'csp_report',
    'media',
    'websocket',
    'webtransport',
    'webbundle',
    'other'
] as chrome.declarativeNetRequest.ResourceType[];

/** CONFIGURATION MODEL **/

/*
 * Identities only have to be unique inside one configuration, so a counter is
 * enough and keeps the migrated ids readable. randomUUID is used when
 * available so two configurations merged by hand cannot collide.
 */
let idCounter = 0;

export function newId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    idCounter += 1;
    return `id-${idCounter}`;
}

export function createEmptyRule(): Rule {
    return {
        status: 'on',
        name: '',
        apply_on: 'req',
        action: 'set',
        header_name: '',
        header_value: '',
        url_filter: ''
    };
}

export function createEmptyRuleItem(): RuleItem {
    return {kind: 'rule', id: newId(), ...createEmptyRule()};
}

export function createEmptyGroupHeader(): GroupHeader {
    return {id: newId(), status: 'on', apply_on: 'req', action: 'set', header_name: '', header_value: ''};
}

export function createEmptyGroup(): GroupItem {
    return {kind: 'group', id: newId(), status: 'on', name: '', url_filter: '', headers: [createEmptyGroupHeader()]};
}

/*
 * What a brand new installation starts with : one rule and one group, filled
 * in so the table shows what the columns are for instead of a blank line.
 *
 * Both are off. The user has not written these, so pressing Start must not
 * suddenly rewrite their traffic — the switch is the invitation to try them.
 * This is only used on first install. A user who deletes every line gets an
 * empty rule back, not the samples again.
 */
export function getDefaultConfig(): Config {
    return {
        format_version: CONFIG_FORMAT_VERSION,
        debug_mode: false,
        items: [createSampleRule(), createSampleGroup()]
    };
}

function createSampleRule(): RuleItem {
    return {
        kind: 'rule',
        id: newId(),
        status: 'off',
        name: 'Example : tag requests with a debug header',
        apply_on: 'req',
        action: 'set',
        header_name: 'X-Debug-Mode',
        header_value: '1',
        url_filter: 'example.com'
    };
}

/* A group is the answer to "same URL, several headers", so the sample is one. */
function createSampleGroup(): GroupItem {
    return {
        kind: 'group',
        id: newId(),
        status: 'off',
        name: 'Example : open up CORS on a local server',
        url_filter: 'localhost',
        headers: [sampleHeader('Access-Control-Allow-Origin', '*'), sampleHeader('Access-Control-Allow-Headers', '*')]
    };
}

function sampleHeader(header_name: string, header_value: string): GroupHeader {
    return {id: newId(), status: 'on', apply_on: 'res', action: 'set', header_name, header_value};
}

/*
 * Expands a group into the standalone rules it stands for : every header
 * inherits the group name and url filter, and a disabled group disables all
 * of its headers at once.
 */
export function expandGroup(group: GroupItem): Rule[] {
    return group.headers.map((header) => ({
        status: group.status === 'on' ? header.status : 'off',
        name: group.name,
        apply_on: header.apply_on,
        action: header.action,
        header_name: header.header_name,
        header_value: header.header_value,
        url_filter: group.url_filter
    }));
}

/** Flattens the configuration into the plain rule list the browser needs. */
export function flattenItems(items: ConfigItem[]): Rule[] {
    return items.flatMap((item) => (item.kind === 'group' ? expandGroup(item) : [item]));
}

/*
 * Configurations saved by version 1.x used a "headers" list with per-rule
 * "url_contains" filtering and cookie actions that Manifest V3 cannot support.
 * Version 2.0 had a flat "rules" list, without groups.
 */
interface LegacyHeader {
    status?: string;
    apply_on?: string;
    action: string;
    header_name?: string;
    header_value?: string;
    url_contains?: string;
}

interface LegacyConfig {
    format_version?: string;
    debug_mode?: boolean;
    use_url_contains?: boolean;
    headers?: LegacyHeader[];
    rules?: Rule[];
    /* 3.0 already had the mixed item list, only without the ids. */
    items?: ConfigItem[];
}

function toItems(rules: Rule[]): ConfigItem[] {
    const items: ConfigItem[] = rules.map((rule) => ({kind: 'rule', id: newId(), ...rule}));
    return items.length > 0 ? items : [createEmptyRuleItem()];
}

/** A 3.0 configuration is complete except for the item and header ids. */
function migrateV3(legacy: LegacyConfig): Config {
    const items = (legacy.items || []).map((item) =>
        item.kind === 'group'
            ? {...item, id: newId(), headers: item.headers.map((header) => ({...header, id: newId()}))}
            : {...item, id: newId()}
    );
    return {
        format_version: CONFIG_FORMAT_VERSION,
        debug_mode: !!legacy.debug_mode,
        items: items.length > 0 ? items : [createEmptyRuleItem()]
    };
}

/** A 2.0 configuration only needs each of its rules wrapped into an item. */
function migrateV2(legacy: LegacyConfig): Config {
    return {
        format_version: CONFIG_FORMAT_VERSION,
        debug_mode: !!legacy.debug_mode,
        items: toItems(legacy.rules || [])
    };
}

function migrateV1(legacy: LegacyConfig): Config {
    const rules: Rule[] = (legacy.headers || [])
        .filter((header) => !header.action.startsWith('cookie'))
        .map((header) => ({
            status: header.status === 'on' ? 'on' : 'off',
            name: '',
            apply_on: header.apply_on === 'res' ? 'res' : 'req',
            action: header.action === 'delete' ? 'delete' : 'set',
            header_name: header.header_name || '',
            header_value: header.header_value || '',
            url_filter: legacy.use_url_contains ? header.url_contains || '' : ''
        }));

    return {
        format_version: CONFIG_FORMAT_VERSION,
        debug_mode: !!legacy.debug_mode,
        items: toItems(rules)
    };
}

export function migrateConfig(stored: Config | LegacyConfig): Config {
    if (stored.format_version === CONFIG_FORMAT_VERSION) return stored as Config;

    const legacy = stored as LegacyConfig;
    if (legacy.items) return migrateV3(legacy);
    if (legacy.rules) return migrateV2(legacy);
    if (legacy.headers) return migrateV1(legacy);
    return getDefaultConfig();
}

/** RULE CONVERSION TO declarativeNetRequest **/

/*
 * A url filter wrapped in slashes (/.../) is a regular expression,
 * anything else is a declarativeNetRequest url substring filter.
 */
function isRegexFilter(url_filter: string): boolean {
    const trimmed = url_filter.trim();
    return trimmed.length > 2 && trimmed.startsWith('/') && trimmed.endsWith('/');
}

function extractRegexSource(url_filter: string): string {
    return url_filter.trim().slice(1, -1);
}

function buildRuleCondition(url_filter: string): chrome.declarativeNetRequest.RuleCondition {
    const condition: chrome.declarativeNetRequest.RuleCondition = {resourceTypes: ALL_RESOURCE_TYPES};
    const trimmed = url_filter.trim();
    if (trimmed === '') return condition;
    if (isRegexFilter(trimmed)) condition.regexFilter = extractRegexSource(trimmed);
    else condition.urlFilter = trimmed;
    return condition;
}

function buildHeaderAction(rule: Rule): chrome.declarativeNetRequest.RuleAction {
    const header_directive: chrome.declarativeNetRequest.ModifyHeaderInfo = {
        header: rule.header_name,
        operation: rule.action === 'delete' ? 'remove' : 'set'
    } as chrome.declarativeNetRequest.ModifyHeaderInfo;
    if (rule.action !== 'delete') header_directive.value = rule.header_value;

    const action = {type: 'modifyHeaders'} as chrome.declarativeNetRequest.RuleAction;
    if (rule.apply_on === 'res') action.responseHeaders = [header_directive];
    else action.requestHeaders = [header_directive];
    return action;
}

/*
 * Tells if a configuration line can produce a declarativeNetRequest rule.
 * A block rule needs a url filter, otherwise it would block every request.
 */
export function isRuleComplete(rule: Rule): boolean {
    if (rule.status !== 'on') return false;
    if (rule.action === 'block') return rule.url_filter.trim() !== '';
    return rule.header_name.trim() !== '';
}

/*
 * Rules apply top to bottom : the first one to change a header wins, so the
 * declarativeNetRequest priority decreases as the line number increases.
 * Groups are expanded beforehand, so a group takes as many priority slots as
 * it has headers, right where it sits in the list.
 */
export function convertRulesToDynamicRules(rules: Rule[]): chrome.declarativeNetRequest.Rule[] {
    const applicable = rules.filter(isRuleComplete);
    return applicable.map((rule, index) => ({
        id: index + 1,
        priority: applicable.length - index,
        condition: buildRuleCondition(rule.url_filter),
        action:
            rule.action === 'block'
                ? ({type: 'block'} as chrome.declarativeNetRequest.RuleAction)
                : buildHeaderAction(rule)
    }));
}

export function convertItemsToDynamicRules(items: ConfigItem[]): chrome.declarativeNetRequest.Rule[] {
    return convertRulesToDynamicRules(flattenItems(items));
}
