const builder = require('xmlbuilder');
const AWS = require('aws-sdk');
AWS.config.update({region:'eu-west-1'});

/**
 * A restify function that will return the xml file created from the current AWS CodePipeline state.
 *
 * @param {Object} req - the request incoming from restify.
 * @param {Object} res - the response to send to the client.
 * @param {Object} next - pass on to the next part of the chain.
 * @return {Promise<void>}
 */
exports.getCCxml = async function(req, res, next) {
  try {
    const ccFile = {
      Projects: {
        Project: await createCCProjectList(),
      },
    };
    const xml = builder.create(ccFile);
    res.header('Content-Type', 'application/xml');
    res.send(xml.end());
  } catch(err) {
    console.log(err)
  }
  res.end();
  next();
};


/**
 * create a project to the current project list.
 *
 * @param {string} state - AWS state to transform into ccTray state.
 * @param {string} name - Name of the project.
 * @param {date} lastBuildTime - The time of the last build from the build history.
 * @return {{"@name": *, "@webUrl": string, "@activity": string, "@lastBuildTime": string, "@lastBuildStatus": string}}
 */
function createProject(state, name, lastBuildTime) {
  let activity = 'Sleeping';
  let currentState = 'Success';

  switch (state) {
    case 'Succeeded':
      activity = 'Sleeping';
      currentState = 'Success';
      break;
    case 'InProgress':
      activity = 'Building';
      currentState = 'Success';
      break;
    case 'Failed':
      activity = 'Sleeping';
      currentState = 'Failure';
      break;
  }

  const project = {
    '@activity': activity,
    '@lastBuildStatus': currentState,
    '@webUrl': '',
    '@name': name,
    '@lastBuildTime': lastBuildTime.toISOString(),
  };
  return project;
}


/**
 * Creates the list of projects in ccTray format.
 *
 * @return {Promise<Array>} list of projects
 */
async function createCCProjectList() {
  const codepipeline = new AWS.CodePipeline();
  const projectList = [];

  const pipelineList = await codepipeline.listPipelines({}).promise();
  for (let i = 0; i < pipelineList.pipelines.length; i++) {
    const data = await codepipeline.getPipelineState({'name': pipelineList.pipelines[i].name}).promise();
    const name = data.pipelineName;
    const stages = data.stageStates;
    const execData = await codepipeline.listPipelineExecutions({pipelineName: name}).promise();
    for (let j = 0; j < stages.length; j++) {
      projectList.push(createProject(stages[j].latestExecution.status, name + '-' + stages[j].stageName,
          execData.pipelineExecutionSummaries[0].lastUpdateTime));
    }
  }
  return projectList;
}
