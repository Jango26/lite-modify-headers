// Tests for the configuration model and its conversion to declarativeNetRequest rules.

import {describe, expect, it} from 'vitest';
import {
    convertItemsToDynamicRules,
    convertRulesToDynamicRules,
    createEmptyGroup,
    createEmptyGroupHeader,
    createEmptyRule,
    createEmptyRuleItem,
    expandGroup,
    flattenItems,
    getDefaultConfig,
    migrateConfig,
    type GroupHeader,
    type GroupItem,
    type Rule,
    type RuleItem
} from './config';

/*
 * Ids are freshly minted every time an item is created, so comparing a
 * migrated item to a newly built one has to ignore them.
 */
function withoutIds<T>(value: T): T {
    return JSON.parse(JSON.stringify(value, (key, entry) => (key === 'id' ? undefined : entry)));
}

describe('Rule conversion', () => {
    function rule(overrides: Partial<Rule> = {}): Rule {
        return {...createEmptyRule(), header_name: 'x-test', ...overrides};
    }

    describe('url filter', () => {
        it('matches all urls when the filter is blank', () => {
            const converted = convertRulesToDynamicRules([rule({url_filter: '   '})]);
            expect(converted[0].condition.urlFilter).toBeUndefined();
            expect(converted[0].condition.regexFilter).toBeUndefined();
        });

        it('uses a substring filter for a plain value', () => {
            const converted = convertRulesToDynamicRules([rule({url_filter: 'example.com'})]);
            expect(converted[0].condition.urlFilter).toEqual('example.com');
        });

        it('uses a regex filter when wrapped in slashes', () => {
            const converted = convertRulesToDynamicRules([rule({url_filter: '/api\\/v[12]/'})]);
            expect(converted[0].condition.regexFilter).toEqual('api\\/v[12]');
            expect(converted[0].condition.urlFilter).toBeUndefined();
        });

        it('treats a lone slash as a substring, not a regex', () => {
            const converted = convertRulesToDynamicRules([rule({url_filter: '/'})]);
            expect(converted[0].condition.urlFilter).toEqual('/');
        });
    });

    describe('action', () => {
        it('sets a request header', () => {
            const converted = convertRulesToDynamicRules([rule({header_value: 'v', apply_on: 'req'})]);
            expect(converted[0].action.type).toEqual('modifyHeaders');
            expect(converted[0].action.requestHeaders).toEqual([{header: 'x-test', operation: 'set', value: 'v'}]);
        });

        it('sets a response header', () => {
            const converted = convertRulesToDynamicRules([rule({header_value: 'v', apply_on: 'res'})]);
            expect(converted[0].action.responseHeaders).toEqual([{header: 'x-test', operation: 'set', value: 'v'}]);
            expect(converted[0].action.requestHeaders).toBeUndefined();
        });

        it('removes a header without sending a value', () => {
            const converted = convertRulesToDynamicRules([rule({action: 'delete', header_value: 'ignored'})]);
            expect(converted[0].action.requestHeaders).toEqual([{header: 'x-test', operation: 'remove'}]);
        });

        it('blocks a request', () => {
            const converted = convertRulesToDynamicRules([rule({action: 'block', url_filter: 'ads.example'})]);
            expect(converted[0].action).toEqual({type: 'block'});
        });
    });

    describe('filtering of incomplete rules', () => {
        it('skips deactivated rules', () => {
            expect(convertRulesToDynamicRules([rule({status: 'off'})]).length).toEqual(0);
        });

        it('skips rules without a header name', () => {
            expect(convertRulesToDynamicRules([rule({header_name: '  '})]).length).toEqual(0);
        });

        it('skips a block rule without a url filter, to not block everything', () => {
            expect(convertRulesToDynamicRules([rule({action: 'block', url_filter: ''})]).length).toEqual(0);
        });

        it('keeps a block rule that has a url filter', () => {
            expect(convertRulesToDynamicRules([rule({action: 'block', url_filter: 'x'})]).length).toEqual(1);
        });
    });

    describe('priority', () => {
        it('gives the first rule the highest priority, so it wins', () => {
            const converted = convertRulesToDynamicRules([rule(), rule(), rule()]);
            expect(converted.map((r) => r.priority)).toEqual([3, 2, 1]);
        });

        it('numbers ids from one without gaps when rules are skipped', () => {
            const converted = convertRulesToDynamicRules([rule(), rule({status: 'off'}), rule()]);
            expect(converted.map((r) => r.id)).toEqual([1, 2]);
        });
    });
});

describe('Config migration', () => {
    function v1Config(overrides: Record<string, unknown> = {}) {
        return {
            format_version: '1.2',
            target_page: 'https://httpbin.org/*',
            debug_mode: false,
            use_url_contains: false,
            headers: [],
            ...overrides
        };
    }

    function v1Header(overrides: Record<string, unknown> = {}) {
        return {
            url_contains: '',
            action: 'add',
            header_name: 'x-old',
            header_value: 'old',
            comment: 'c',
            apply_on: 'req',
            status: 'on',
            ...overrides
        };
    }

    it('leaves a current configuration untouched', () => {
        const current = getDefaultConfig();
        expect(migrateConfig(current)).toBe(current);
    });

    it('converts add and modify to set', () => {
        const migrated = migrateConfig(v1Config({headers: [v1Header({action: 'add'}), v1Header({action: 'modify'})]}));
        expect(migrated.items.map((r) => (r as RuleItem).action)).toEqual(['set', 'set']);
    });

    it('keeps delete', () => {
        const migrated = migrateConfig(v1Config({headers: [v1Header({action: 'delete'})]}));
        expect((migrated.items[0] as RuleItem).action).toEqual('delete');
    });

    it('drops cookie rules that Manifest V3 cannot support', () => {
        const migrated = migrateConfig(
            v1Config({
                headers: [v1Header({action: 'cookie_add_or_modify'}), v1Header({action: 'cookie_delete'})]
            })
        );
        expect(migrated.items.length).toEqual(1);
        expect(withoutIds(migrated.items[0])).toEqual(withoutIds(createEmptyRuleItem()));
    });

    it('carries url_contains over only when it was active', () => {
        const active = migrateConfig(v1Config({use_url_contains: true, headers: [v1Header({url_contains: 'api'})]}));
        expect((active.items[0] as RuleItem).url_filter).toEqual('api');

        const inactive = migrateConfig(v1Config({headers: [v1Header({url_contains: 'api'})]}));
        expect((inactive.items[0] as RuleItem).url_filter).toEqual('');
    });

    it('always leaves at least one editable rule', () => {
        expect(withoutIds(migrateConfig(v1Config({headers: []})).items)).toEqual(withoutIds([createEmptyRuleItem()]));
    });

    it('falls back to the default config when there is nothing to migrate', () => {
        expect(withoutIds(migrateConfig({format_version: '1.2'}))).toEqual(withoutIds(getDefaultConfig()));
    });

    it('wraps the rules of a 2.0 configuration into items', () => {
        const rule = {...createEmptyRule(), header_name: 'x-two'};
        const migrated = migrateConfig({format_version: '2.0', debug_mode: true, rules: [rule]});
        expect(withoutIds(migrated.items)).toEqual([{kind: 'rule', ...rule}]);
        expect(migrated.debug_mode).toEqual(true);
    });

    it('leaves at least one editable rule when a 2.0 configuration was empty', () => {
        expect(withoutIds(migrateConfig({format_version: '2.0', rules: []}).items)).toEqual(
            withoutIds([createEmptyRuleItem()])
        );
    });

    it('gives every item and group header of a 3.0 configuration a fresh id', () => {
        const stored = {
            format_version: '3.0',
            debug_mode: false,
            items: [
                {kind: 'rule', ...createEmptyRule()},
                {kind: 'group', status: 'on', name: 'g', url_filter: 'api', headers: [createEmptyGroupHeader()]}
            ]
        };
        const migrated = migrateConfig(stored as never);

        const group = migrated.items[1] as GroupItem;
        const ids = [migrated.items[0].id, group.id, group.headers[0].id];
        expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
        expect(new Set(ids).size).toEqual(3);
        expect(withoutIds(migrated.items)).toEqual(withoutIds(stored.items));
    });
});

describe('Groups', () => {
    function header(overrides: Partial<GroupHeader> = {}): GroupHeader {
        return {...createEmptyGroupHeader(), header_name: 'x-group', ...overrides};
    }

    function group(overrides: Partial<GroupItem> = {}): GroupItem {
        return {...createEmptyGroup(), name: 'g', url_filter: 'api', headers: [header()], ...overrides};
    }

    describe('expansion', () => {
        it('gives every header the group name and url filter', () => {
            const expanded = expandGroup(group({headers: [header({header_name: 'a'}), header({header_name: 'b'})]}));
            expect(expanded.map((r) => r.name)).toEqual(['g', 'g']);
            expect(expanded.map((r) => r.url_filter)).toEqual(['api', 'api']);
            expect(expanded.map((r) => r.header_name)).toEqual(['a', 'b']);
        });

        it('deactivates every header when the group is off', () => {
            const expanded = expandGroup(group({status: 'off', headers: [header(), header()]}));
            expect(expanded.map((r) => r.status)).toEqual(['off', 'off']);
        });

        it('keeps a header deactivated even when the group is on', () => {
            const expanded = expandGroup(group({headers: [header({status: 'off'}), header()]}));
            expect(expanded.map((r) => r.status)).toEqual(['off', 'on']);
        });
    });

    describe('flattening', () => {
        it('keeps standalone rules and groups in order', () => {
            const first = {...createEmptyRuleItem(), header_name: 'first'};
            const last = {...createEmptyRuleItem(), header_name: 'last'};
            const flat = flattenItems([first, group({headers: [header({header_name: 'mid'})]}), last]);
            expect(flat.map((r) => r.header_name)).toEqual(['first', 'mid', 'last']);
        });
    });

    describe('conversion', () => {
        it('turns each header of a group into its own browser rule', () => {
            const converted = convertItemsToDynamicRules([
                group({headers: [header({header_name: 'a', header_value: '1'}), header({header_name: 'b'})]})
            ]);
            expect(converted.length).toEqual(2);
            expect(converted[0].condition.urlFilter).toEqual('api');
            expect(converted[0].action.requestHeaders).toEqual([{header: 'a', operation: 'set', value: '1'}]);
        });

        it('registers nothing for a deactivated group', () => {
            expect(convertItemsToDynamicRules([group({status: 'off'})]).length).toEqual(0);
        });

        it('takes as many priority slots as the group has headers', () => {
            const trailing = {...createEmptyRuleItem(), header_name: 'trailing'};
            const converted = convertItemsToDynamicRules([group({headers: [header(), header()]}), trailing]);
            expect(converted.map((r) => r.priority)).toEqual([3, 2, 1]);
        });

        it('skips headers left blank inside a group', () => {
            const converted = convertItemsToDynamicRules([group({headers: [header({header_name: '  '}), header()]})]);
            expect(converted.length).toEqual(1);
        });
    });
});
