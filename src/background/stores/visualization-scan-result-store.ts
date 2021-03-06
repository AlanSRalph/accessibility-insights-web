// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { autobind } from '@uifabric/utilities';
import * as _ from 'lodash/index';

import { forOwn } from 'lodash/index';
import { StoreNames } from '../../common/stores/store-names';
import { IVisualizationScanResultData } from '../../common/types/store-data/ivisualization-scan-result-data';
import { DecoratedAxeNodeResult, IHtmlElementAxeResults } from '../../injected/scanner-utils';
import { DictionaryStringTo } from '../../types/common-types';
import { AddTabbedElementPayload } from '../actions/action-payloads';
import { TabActions } from '../actions/tab-actions';
import { VisualizationScanResultActions } from '../actions/visualization-scan-result-actions';
import { IScanCompletedPayload } from './../../injected/analyzers/ianalyzer';
import { ITabStopEvent } from './../../injected/tab-stops-listener';
import { BaseStore } from './base-store';

export class VisualizationScanResultStore extends BaseStore<IVisualizationScanResultData> {
    private visualizationScanResultsActions: VisualizationScanResultActions;
    private tabActions: TabActions;

    constructor(visualizationScanResultActions: VisualizationScanResultActions, tabActions: TabActions) {
        super(StoreNames.VisualizationScanResultStore);

        this.visualizationScanResultsActions = visualizationScanResultActions;
        this.tabActions = tabActions;
    }

    public getDefaultState(): IVisualizationScanResultData {
        const state: Partial<IVisualizationScanResultData> = {
            tabStops: {
                tabbedElements: null,
            },
        };

        const keys = ['issues', 'landmarks', 'headings', 'color'];

        keys.forEach(key => {
            state[key] = {
                fullAxeResultsMap: null,
                scanResult: null,
                selectedAxeResultsMap: null,
                selectedIdToRuleResultMap: null,
                fullIdToRuleResultMap: null,
            };
        });

        return state as IVisualizationScanResultData;
    }

    protected addActionListeners(): void {
        this.visualizationScanResultsActions.scanCompleted.addListener(this.onScanCompleted);
        this.visualizationScanResultsActions.getCurrentState.addListener(this.onGetCurrentState);
        this.visualizationScanResultsActions.updateIssuesSelectedTargets.addListener(this.onUpdateIssuesSelectedTargets);
        this.visualizationScanResultsActions.disableIssues.addListener(this.onIssuesDisabled);
        this.visualizationScanResultsActions.addTabbedElement.addListener(this.onAddTabbedElement);
        this.visualizationScanResultsActions.disableTabStop.addListener(this.onTabStopsDisabled);

        this.tabActions.tabChange.addListener(this.onTabChange);
    }

    @autobind
    private onTabStopsDisabled(): void {
        this.state.tabStops.tabbedElements = null;
        this.emitChanged();
    }

    @autobind
    private onAddTabbedElement(payload: AddTabbedElementPayload): void {
        if (!this.state.tabStops.tabbedElements) {
            this.state.tabStops.tabbedElements = [];
        }

        let tabbedElementsWithoutTabOrder: ITabStopEvent[] = _.map(this.state.tabStops.tabbedElements, element => {
            return {
                timestamp: element.timestamp,
                target: element.target,
                html: element.html,
            };
        });

        tabbedElementsWithoutTabOrder = tabbedElementsWithoutTabOrder.concat(payload.tabbedElements);
        tabbedElementsWithoutTabOrder.sort((left, right) => left.timestamp - right.timestamp);

        this.state.tabStops.tabbedElements = _.map(tabbedElementsWithoutTabOrder, (element, index) => {
            return {
                timestamp: element.timestamp,
                target: element.target,
                html: element.html,
                tabOrder: index + 1,
            };
        });

        this.emitChanged();
    }

    @autobind
    private onScanCompleted(payload: IScanCompletedPayload<any>): void {
        const selectorMap = payload.selectorMap;
        const result = payload.scanResult;
        const selectedRows = this.getRowToRuleResultMap(selectorMap);

        this.state[payload.key].selectedAxeResultsMap = selectorMap;
        this.state[payload.key].fullIdToRuleResultMap = selectedRows;
        this.state[payload.key].selectedIdToRuleResultMap = selectedRows;
        this.state[payload.key].fullAxeResultsMap = selectorMap;
        this.state[payload.key].scanResult = result;

        this.emitChanged();
    }

    @autobind
    private onUpdateIssuesSelectedTargets(selected: string[]): void {
        const newSelectedRows: DictionaryStringTo<DecoratedAxeNodeResult> = {};

        selected.forEach(uid => {
            const value = this.state.issues.fullIdToRuleResultMap[uid];

            if (value != null) {
                newSelectedRows[uid] = value;
            }
        });

        this.state.issues.selectedAxeResultsMap = this.getSelectorMap(newSelectedRows);
        this.state.issues.selectedIdToRuleResultMap = newSelectedRows;
        this.emitChanged();
    }

    @autobind
    private onIssuesDisabled(): void {
        this.state.issues.scanResult = null;
        this.emitChanged();
    }

    @autobind
    private onTabChange(): void {
        this.state = this.getDefaultState();
        this.emitChanged();
    }

    private getRowToRuleResultMap(selectorMap: DictionaryStringTo<IHtmlElementAxeResults>): DictionaryStringTo<DecoratedAxeNodeResult> {
        const selectedRows: DictionaryStringTo<DecoratedAxeNodeResult> = {};

        forOwn(selectorMap, (selector: IHtmlElementAxeResults) => {
            const ruleResults = selector.ruleResults;

            forOwn(ruleResults, (rule: DecoratedAxeNodeResult) => {
                selectedRows[rule.id] = rule;
            });
        });

        return selectedRows;
    }

    private getSelectorMap(selectedRows: DictionaryStringTo<DecoratedAxeNodeResult>): DictionaryStringTo<IHtmlElementAxeResults> {
        const selectorMap: DictionaryStringTo<IHtmlElementAxeResults> = {};
        forOwn(selectedRows, (selectedRow: DecoratedAxeNodeResult) => {
            const ruleResult = selectedRow;
            const ruleResults = selectorMap[ruleResult.selector] ? selectorMap[ruleResult.selector].ruleResults : {};
            const isVisible = selectorMap[ruleResult.selector] ? selectorMap[ruleResult.selector].isVisible : null;

            ruleResults[ruleResult.ruleId] = ruleResult;
            selectorMap[ruleResult.selector] = {
                ruleResults: ruleResults,
                target: ruleResult.selector.split(';'),
                isVisible: isVisible,
            };
        });

        return selectorMap;
    }
}
