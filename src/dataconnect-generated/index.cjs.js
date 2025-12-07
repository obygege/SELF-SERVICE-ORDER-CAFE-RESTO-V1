const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'cafe-pos-system',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUser');
}
createUserRef.operationName = 'CreateUser';
exports.createUserRef = createUserRef;

exports.createUser = function createUser(dc) {
  return executeMutation(createUserRef(dc));
};

const listDataPointsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDataPoints');
}
listDataPointsRef.operationName = 'ListDataPoints';
exports.listDataPointsRef = listDataPointsRef;

exports.listDataPoints = function listDataPoints(dc) {
  return executeQuery(listDataPointsRef(dc));
};

const updateDataSeriesDescriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateDataSeriesDescription', inputVars);
}
updateDataSeriesDescriptionRef.operationName = 'UpdateDataSeriesDescription';
exports.updateDataSeriesDescriptionRef = updateDataSeriesDescriptionRef;

exports.updateDataSeriesDescription = function updateDataSeriesDescription(dcOrVars, vars) {
  return executeMutation(updateDataSeriesDescriptionRef(dcOrVars, vars));
};

const getDataSeriesByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDataSeriesByName', inputVars);
}
getDataSeriesByNameRef.operationName = 'GetDataSeriesByName';
exports.getDataSeriesByNameRef = getDataSeriesByNameRef;

exports.getDataSeriesByName = function getDataSeriesByName(dcOrVars, vars) {
  return executeQuery(getDataSeriesByNameRef(dcOrVars, vars));
};
