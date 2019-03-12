const assert = require('assert');
const rewire = require('rewire');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
const creator = rewire('../app/ccTrayCreator');

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
            name: 'stageName',
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

    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CodePipeline', 'getPipelineState', getPipelineState);
    AWS.mock('CodePipeline', 'listPipelineExecutions', listPipelineExecutions);

    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      send: resSend,
      end: sinon.stub().returns(),
    };


    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[0];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Sleeping" lastBuildStatus="Success" ' +
      'webUrl="" name="testPipeline-undefined" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
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
            name: 'stageName',
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

    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CodePipeline', 'getPipelineState', getPipelineState);
    AWS.mock('CodePipeline', 'listPipelineExecutions', listPipelineExecutions);

    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      send: resSend,
      end: sinon.stub().returns(),
    };


    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[0];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Building" lastBuildStatus="Success" ' +
      'webUrl="" name="testPipeline-undefined" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
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
            name: 'stageName',
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

    AWS.restore();
    AWS.mock('CodePipeline', 'listPipelines', listStub);
    AWS.mock('CodePipeline', 'getPipelineState', getPipelineState);
    AWS.mock('CodePipeline', 'listPipelineExecutions', listPipelineExecutions);

    const resSend = sinon.stub().returns();


    const next = sinon.stub().returns();
    const res = {
      header: sinon.stub().returns(),
      send: resSend,
      end: sinon.stub().returns(),
    };


    await creator.getCCxml({}, res, next);
    const cc = resSend.getCall(0).args[0];
    const expectedXml = '<?xml version="1.0"?><Projects><Project activity="Sleeping" lastBuildStatus="Failure" ' +
      'webUrl="" name="testPipeline-undefined" lastBuildTime="1970-01-01T00:00:00.001Z"/></Projects>';
    assert.deepStrictEqual(cc, expectedXml, 'message does match expected schema');
  });
});
