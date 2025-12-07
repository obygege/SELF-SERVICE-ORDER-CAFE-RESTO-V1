import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'cafe-pos-system',
  location: 'us-east4'
};

export const createUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUser');
}
createUserRef.operationName = 'CreateUser';

export function createUser(dc) {
  return executeMutation(createUserRef(dc));
}

export const listDataPointsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDataPoints');
}
listDataPointsRef.operationName = 'ListDataPoints';

export function listDataPoints(dc) {
  return executeQuery(listDataPointsRef(dc));
}

export const updateDataSeriesDescriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateDataSeriesDescription', inputVars);
}
updateDataSeriesDescriptionRef.operationName = 'UpdateDataSeriesDescription';

export function updateDataSeriesDescription(dcOrVars, vars) {
  return executeMutation(updateDataSeriesDescriptionRef(dcOrVars, vars));
}

export const getDataSeriesByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDataSeriesByName', inputVars);
}
getDataSeriesByNameRef.operationName = 'GetDataSeriesByName';

export function getDataSeriesByName(dcOrVars, vars) {
  return executeQuery(getDataSeriesByNameRef(dcOrVars, vars));
}

