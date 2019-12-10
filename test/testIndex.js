const assert = require('assert');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
const creator = require('../app/ccTrayCreator');
const config = require('./config');

describe('index', function() {
  it('test create project creates success project correctly.', async function() {
    const listStub = sinon.stub()
        .returns(Promise.resolve({
          pipelines: [{
            name: 'testPipeline',
          }],
        }));

    const getPipelineState = sinon.stub()
        .returns(Promise.resolve({
          pipelineName: 'testPipeline',
          stageStates: [{
            stageName: 'stageName',
            latestExecution: {
              status: 'Succeeded',
            },
          }],
        }));

    const listPipelineExecutions = sinon.stub()
        .returns(Promise.resolve({
          pipelineExecutionSummaries: [{
            lastUpdateTime: new Date(1),
          }],
        }));

    const alarmStub = sinon.stub()
      .returns(Promise.resolve({MetricAlarms: []}));


    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CodePipeline', 'getPipelineState', getPipelineState);
    AWS.mock('CodePipeline', 'listPipelineExecutions', listPipelineExecutions);

    AWS.mock('CloudWatch', 'describeAlarms', alarmStub);
    await creator.initialize(config);
    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      sendRaw: resSend,
      end: sinon.stub().returns(),
    };

    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[1];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Sleeping" lastBuildStatus="Success" ' +
      'webUrl="" name="testPipeline-stageName" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });


  it('test create project creates a in progress project correctly.', async function() {
    const listStub = sinon.stub()
        .returns(Promise.resolve({
          pipelines: [{
            name: 'testPipeline',
          }],
        }));

    const getPipelineState = sinon.stub()
        .returns(Promise.resolve({
          pipelineName: 'testPipeline',
          stageStates: [{
            stageName: 'stageName',
            latestExecution: {
              status: 'InProgress',
            },
          }],
        }));

    const listPipelineExecutions = sinon.stub()
        .returns(Promise.resolve({
          pipelineExecutionSummaries: [{
            lastUpdateTime: new Date(1),
          }],
        }));

    const alarmStub = sinon.stub()
      .returns(Promise.resolve({MetricAlarms: []}));

    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CodePipeline', 'getPipelineState', getPipelineState);
    AWS.mock('CodePipeline', 'listPipelineExecutions', listPipelineExecutions);
    AWS.mock('CloudWatch', 'describeAlarms', alarmStub);

    await creator.initialize(config);
    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      sendRaw: resSend,
      end: sinon.stub().returns(),
    };

    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[1];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Building" lastBuildStatus="Success" ' +
      'webUrl="" name="testPipeline-stageName" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });

  it('test create project creates a in progress project correctly.', async function() {
    const listStub = sinon.stub()
        .returns(Promise.resolve({
          pipelines: [{
            name: 'testPipeline',
          }],
        }));

    const getPipelineState = sinon.stub()
        .returns(Promise.resolve({
          pipelineName: 'testPipeline',
          stageStates: [{
            stageName: 'stageName',
            latestExecution: {
              status: 'Failed',
            },
          }],
        }));

    const listPipelineExecutions = sinon.stub()
        .returns(Promise.resolve({
          pipelineExecutionSummaries: [{
            lastUpdateTime: new Date(1),
          }],
        }));

    const alarmStub = sinon.stub()
      .returns(Promise.resolve({MetricAlarms: []}));


    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CodePipeline', 'getPipelineState', getPipelineState);
    AWS.mock('CodePipeline', 'listPipelineExecutions', listPipelineExecutions);
    AWS.mock('CloudWatch', 'describeAlarms', alarmStub);
    await creator.initialize(config);
    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      sendRaw: resSend,
      end: sinon.stub().returns(),
    };

    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[1];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Sleeping" lastBuildStatus="Failure" ' +
      'webUrl="" name="testPipeline-stageName" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });

  it('test create alarm in failed state', async function() {
    const listStub = sinon.stub()
      .returns(Promise.resolve({
        pipelines: [],
      }));

    const alarmStub = sinon.stub()
      .returns(Promise.resolve({
      MetricAlarms: [{
        AlarmName: 'AlarmName',
        StateValue: 'ALARM',
        StateUpdatedTimestamp: new Date(1),
      }],
    }));


    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CloudWatch', 'describeAlarms', alarmStub);
    await creator.initialize(config);
    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      sendRaw: resSend,
      end: sinon.stub().returns(),
    };

    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[1];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Sleeping" lastBuildStatus="Failure" webUrl="" ' +
      'name="AlarmName" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });

  it('test create alarm in unknown state', async function() {
    const listStub = sinon.stub()
      .returns(Promise.resolve({
        pipelines: [],
      }));

    const alarmStub = sinon.stub()
      .returns(Promise.resolve({
        MetricAlarms: [{
          AlarmName: 'AlarmName',
          StateValue: 'OK',
          StateUpdatedTimestamp: new Date(1),
        }],
      }));


    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CloudWatch', 'describeAlarms', alarmStub);
    await creator.initialize(config);
    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      sendRaw: resSend,
      end: sinon.stub().returns(),
    };

    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[1];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Sleeping" lastBuildStatus="Success" webUrl="" ' +
      'name="AlarmName" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });

  it('test create alarm in ok state', async function() {
    const listStub = sinon.stub()
      .returns(Promise.resolve({
        pipelines: [],
      }));

    const alarmStub = sinon.stub()
      .returns(Promise.resolve({
        MetricAlarms: [{
          AlarmName: 'AlarmName',
          StateValue: 'INSUFFICIENT_DATA',
          StateUpdatedTimestamp: new Date(1),
        }],
      }));


    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CloudWatch', 'describeAlarms', alarmStub);
    await creator.initialize(config);
    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      sendRaw: resSend,
      end: sinon.stub().returns(),
    };

    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[1];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Building" lastBuildStatus="Success" webUrl="" ' +
      'name="AlarmName" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });

});






