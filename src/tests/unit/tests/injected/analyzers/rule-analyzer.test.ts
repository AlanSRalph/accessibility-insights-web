// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as _ from 'lodash';
import { IMock, It, Mock, Times } from 'typemoq';

import { ScopingInputTypes } from '../../../../../background/scoping-input-types';
import { ScopingStore } from '../../../../../background/stores/global/scoping-store';
import {
    VisualizationConfiguration,
    VisualizationConfigurationFactory,
} from '../../../../../common/configs/visualization-configuration-factory';
import { TelemetryDataFactory } from '../../../../../common/telemetry-data-factory';
import { RuleAnalyzerScanTelemetryData } from '../../../../../common/telemetry-events';
import { IScopingStoreData } from '../../../../../common/types/store-data/scoping-store-data';
import { VisualizationType } from '../../../../../common/types/visualization-type';
import { RuleAnalyzerConfiguration } from '../../../../../injected/analyzers/ianalyzer';
import { RuleAnalyzer } from '../../../../../injected/analyzers/rule-analyzer';
import { IHtmlElementAxeResults, ScannerUtils } from '../../../../../injected/scanner-utils';
import { ScanOptions } from '../../../../../scanner/exposed-apis';
import { ScanResults } from '../../../../../scanner/iruleresults';
import { DictionaryStringTo } from '../../../../../types/common-types';

describe('RuleAnalyzer', () => {
    let scannerUtilsMock: IMock<ScannerUtils>;
    let resultProcessorMock: IMock<(results: ScanResults) => DictionaryStringTo<IHtmlElementAxeResults>>;
    let dateGetterMock: IMock<() => Date>;
    let dateMock: IMock<Date>;
    let scopingStoreMock: IMock<ScopingStore>;
    let scopingState: IScopingStoreData;
    let visualizationConfigurationFactoryMock: IMock<VisualizationConfigurationFactory>;
    const mockAllInstances: DictionaryStringTo<any> = {
        test: 'test-result-value',
    };
    let sendMessageMock: IMock<(message) => void>;
    let telemetryDataFactoryMock: IMock<TelemetryDataFactory>;
    let typeStub: VisualizationType;
    const testName = 'test-name';
    let configStub: RuleAnalyzerConfiguration;
    let scanCallback: (results: ScanResults) => void;

    beforeEach(() => {
        typeStub = -1 as VisualizationType;
        sendMessageMock = Mock.ofInstance(message => {});
        resultProcessorMock = Mock.ofInstance(results => null);
        scannerUtilsMock = Mock.ofType(ScannerUtils);
        scopingStoreMock = Mock.ofType(ScopingStore);
        telemetryDataFactoryMock = Mock.ofType(TelemetryDataFactory);
        visualizationConfigurationFactoryMock = Mock.ofType(VisualizationConfigurationFactory);
        const dateStub = {
            getTime: () => {
                return null;
            },
        };
        dateMock = Mock.ofInstance(dateStub as Date);
        dateGetterMock = Mock.ofInstance(() => null);
        dateGetterMock.setup(dgm => dgm()).returns(() => dateMock.object);
        scopingState = {
            selectors: {
                [ScopingInputTypes.include]: ['fake include selector'],
                [ScopingInputTypes.exclude]: ['fake exclude selector'],
            },
        };
        scopingStoreMock
            .setup(sm => sm.getState())
            .returns(() => scopingState)
            .verifiable();
        visualizationConfigurationFactoryMock
            .setup(v => v.getConfiguration(typeStub))
            .returns(() => {
                return {
                    displayableData: { title: testName },
                } as VisualizationConfiguration;
            })
            .verifiable();
    });

    test('analyze', async done => {
        testGetResults(done);
    });

    function createTelemetryStub(elapsedTime: number, testName: string, requirementName: string): RuleAnalyzerScanTelemetryData {
        const telemetryStub: RuleAnalyzerScanTelemetryData = {
            scanDuration: elapsedTime,
            NumberOfElementsScanned: 2,
            include: [],
            exclude: [],
            testName,
            requirementName,
        };
        return telemetryStub;
    }

    function testGetResults(done: () => void) {
        const key = 'sample key';
        const telemetryProcessorStub = factory => (_, elapsedTime, __) => {
            return createTelemetryStub(elapsedTime, testName, key);
        };
        const startTime = 10;
        const endTime = 20;
        const expectedTelemetryStub = createTelemetryStub(endTime - startTime, testName, key);

        configStub = {
            rules: ['fake-rule'],
            analyzerMessageType: 'sample message type',
            key,
            testType: typeStub,
            telemetryProcessor: telemetryProcessorStub,
            resultProcessor: scanner => resultProcessorMock.object,
        };
        setupScannerUtilsMock(configStub.rules);

        const testSubject = new RuleAnalyzer(
            configStub,
            scannerUtilsMock.object,
            scopingStoreMock.object,
            sendMessageMock.object,
            dateGetterMock.object,
            telemetryDataFactoryMock.object,
            visualizationConfigurationFactoryMock.object,
        );

        const scanResults = createTestResults();

        const expectedMessage = {
            type: configStub.analyzerMessageType,
            payload: {
                key: configStub.key,
                selectorMap: mockAllInstances,
                scanResult: scanResults,
                testType: typeStub,
                telemetry: expectedTelemetryStub,
            },
        };

        resultProcessorMock.setup(processor => processor(scanResults)).returns(() => mockAllInstances);

        sendMessageMock
            .setup(sm => sm(It.isValue(expectedMessage)))
            .returns(() => {
                sendMessageMock.verifyAll();
                done();
            })
            .verifiable();

        dateMock
            .setup(mock => mock.getTime())
            .returns(_ => startTime)
            .verifiable();

        testSubject.analyze();

        dateMock.reset();
        dateMock
            .setup(mock => mock.getTime())
            .returns(_ => endTime)
            .verifiable();

        scanCallback(scanResults);
    }

    function setupScannerUtilsMock(rules: string[]) {
        const getState = scopingStoreMock.object.getState();
        const include = getState.selectors[ScopingInputTypes.include];
        const exclude = getState.selectors[ScopingInputTypes.exclude];

        const scanOptions: ScanOptions = {
            testsToRun: rules,
            include: include,
            exclude: exclude,
        };

        scannerUtilsMock
            .setup((scanner: ScannerUtils) => scanner.scan(It.isValue(scanOptions), It.is(_.isFunction)))
            .callback((rules: string[], callback: (results: ScanResults) => void) => {
                scanCallback = callback;
            })
            .verifiable(Times.once());
    }

    function createTestResults(): ScanResults {
        return {
            passes: [],
            violations: [],
            inapplicable: [],
            incomplete: [],
            timestamp: new Date().toString(),
            targetPageTitle: '',
            targetPageUrl: '',
        };
    }
});
