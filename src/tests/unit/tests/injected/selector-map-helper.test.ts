// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IMock, Mock, MockBehavior } from 'typemoq';

import { IAssessmentsProvider } from '../../../../assessments/types/iassessments-provider';
import { AssessmentStore } from '../../../../background/stores/assessment-store';
import { VisualizationScanResultStore } from '../../../../background/stores/visualization-scan-result-store';
import { IBaseStore } from '../../../../common/istore';
import { ManualTestStatus } from '../../../../common/types/manual-test-status';
import {
    IAssessmentStoreData,
    IGeneratedAssessmentInstance,
    ITestStepResult,
} from '../../../../common/types/store-data/iassessment-result-data';
import { IVisualizationScanResultData } from '../../../../common/types/store-data/ivisualization-scan-result-data';
import { VisualizationType } from '../../../../common/types/visualization-type';
import { IAssessmentVisualizationInstance } from '../../../../injected/frameCommunicators/html-element-axe-results-helper';
import { SelectorMapHelper } from '../../../../injected/selector-map-helper';
import { DictionaryStringTo } from '../../../../types/common-types';
import { CreateTestAssessmentProvider } from '../../common/test-assessment-provider';
import { VisualizationScanResultStoreDataBuilder } from '../../common/visualization-scan-result-store-data-builder';

describe('SelectorMapHelperTest', () => {
    let scanResultStoreMock: IMock<IBaseStore<IVisualizationScanResultData>>;
    let assessmentStoreMock: IMock<IBaseStore<IAssessmentStoreData>>;
    let assessmentsProvider: IAssessmentsProvider;
    let testSelectorMap: DictionaryStringTo<IGeneratedAssessmentInstance<any, any>>;
    let expected: DictionaryStringTo<IAssessmentVisualizationInstance>;
    let testSubject: SelectorMapHelper;

    beforeEach(() => {
        scanResultStoreMock = Mock.ofType(VisualizationScanResultStore, MockBehavior.Strict);
        assessmentStoreMock = Mock.ofType(AssessmentStore, MockBehavior.Strict);
        assessmentsProvider = CreateTestAssessmentProvider();
        expected = {
            key2: {
                html: 'html',
                isFailure: true,
                isVisible: true,
                isVisualizationEnabled: true,
                propertyBag: {},
                target: ['element2'],
                identifier: 'key2',
                ruleResults: null,
            },
        };
        testSelectorMap = {
            key1: {
                target: ['element1'],
                testStepResults: {
                    step1: {
                        status: ManualTestStatus.FAIL,
                        isVisualizationEnabled: true,
                        isVisible: true,
                    } as ITestStepResult,
                },
                ruleResults: null,
                html: null,
            },
            key2: {
                target: ['element2'],
                testStepResults: {
                    step2: {
                        status: ManualTestStatus.FAIL,
                        isVisualizationEnabled: true,
                        isVisible: true,
                    } as ITestStepResult,
                },
                html: 'html',
                propertyBag: {},
            },
        };

        testSubject = new SelectorMapHelper(scanResultStoreMock.object, assessmentStoreMock.object, assessmentsProvider);
    });

    test('constructor', () => {
        expect(new SelectorMapHelper(null, null, null)).toBeDefined();
    });

    test('getState: issues', () => {
        const selectorMap = { key1: { target: ['element1'] } };
        const state = new VisualizationScanResultStoreDataBuilder().withIssuesSelectedTargets(selectorMap as any).build();

        scanResultStoreMock
            .setup(ss => ss.getState())
            .returns(() => state)
            .verifiable();
        setAssessmentStore();

        testSubject.getSelectorMap(VisualizationType.Issues);

        scanResultStoreMock.verifyAll();
    });

    test('getState: headings', () => {
        const type = VisualizationType.Headings;
        const selectorMap = { key1: { target: ['element1'] } };
        const state = new VisualizationScanResultStoreDataBuilder().withSelectorMap(type, selectorMap).build();

        scanResultStoreMock
            .setup(ss => ss.getState())
            .returns(() => state)
            .verifiable();
        setAssessmentStore();

        testSubject.getSelectorMap(type);

        scanResultStoreMock.verifyAll();
    });

    test('getState: landmarks', () => {
        const type = VisualizationType.Landmarks;
        const selectorMap = { key1: { target: ['element1'] } };
        const state = new VisualizationScanResultStoreDataBuilder().withSelectorMap(type, selectorMap).build();

        scanResultStoreMock
            .setup(ss => ss.getState())
            .returns(() => state)
            .verifiable();
        setAssessmentStore();

        testSubject.getSelectorMap(type);

        scanResultStoreMock.verifyAll();
    });

    test('getState: color', () => {
        const type = VisualizationType.Color;
        const selectorMap = { key1: { target: ['element1'] } };
        const state = new VisualizationScanResultStoreDataBuilder().withSelectorMap(type, selectorMap).build();

        scanResultStoreMock
            .setup(ss => ss.getState())
            .returns(() => state)
            .verifiable();
        setAssessmentStore();

        testSubject.getSelectorMap(type);

        scanResultStoreMock.verifyAll();
    });

    test('getState: tabStops', () => {
        const type = VisualizationType.TabStops;
        const state = new VisualizationScanResultStoreDataBuilder().build();

        state.tabStops.tabbedElements = [];

        scanResultStoreMock
            .setup(ss => ss.getState())
            .returns(() => state)
            .verifiable();
        setAssessmentStore();

        testSubject.getSelectorMap(type);

        scanResultStoreMock.verifyAll();
    });

    test('getState for assessment, selector map is not null', () => {
        const assessment = assessmentsProvider.all()[0];
        const type = assessment.type;
        const firstStep = assessment.steps[0];

        const selectorMap = {
            key1: {
                target: ['element1'],
                testStepResults: {
                    step1: {
                        status: ManualTestStatus.FAIL,
                        isVisualizationEnabled: true,
                        isVisible: true,
                    } as ITestStepResult,
                },
                ruleResults: null,
                html: null,
            },
            [assessment.key]: {
                target: ['element2'],
                testStepResults: {
                    [firstStep.key]: {
                        status: ManualTestStatus.FAIL,
                        isVisualizationEnabled: true,
                        isVisible: true,
                    } as ITestStepResult,
                },
                html: 'html',
                propertyBag: {},
            },
        };

        const state = {
            assessments: {
                [assessment.key]: {
                    generatedAssessmentInstancesMap: selectorMap,
                },
            },
            assessmentNavState: {
                selectedTestStep: firstStep.key,
            },
        };

        assessmentStoreMock
            .setup(ss => ss.getState())
            .returns(() => state as any)
            .verifiable();

        const result = testSubject.getSelectorMap(type);

        assessmentStoreMock.verifyAll();
        const expectedSelectedMap = {
            [assessment.key]: {
                html: 'html',
                isFailure: true,
                isVisible: true,
                isVisualizationEnabled: true,
                propertyBag: {},
                target: ['element2'],
                identifier: assessment.key,
                ruleResults: null,
            },
        };

        expect(result).toEqual(expectedSelectedMap);
        assessmentStoreMock.verifyAll();
    });

    test('getState for assessment: selectorMap null', () => {
        const assessment = assessmentsProvider.all()[0];
        const type = assessment.type;
        const firstStep = assessment.steps[0];

        const selectorMap = null;
        const state = {
            assessments: {
                [assessment.key]: {
                    generatedAssessmentInstancesMap: selectorMap,
                },
            },
            assessmentNavState: {
                selectedTestStep: firstStep.key,
            },
        };

        assessmentStoreMock
            .setup(ss => ss.getState())
            .returns(() => state as any)
            .verifiable();

        const result = testSubject.getSelectorMap(type);

        assessmentStoreMock.verifyAll();

        expect(result).toBeNull();
    });

    function setAssessmentStore(): void {
        assessmentStoreMock.setup(a => a.getState()).verifiable();
    }

    function setScanResultStore(): void {
        scanResultStoreMock.setup(a => a.getState()).verifiable();
    }
});
