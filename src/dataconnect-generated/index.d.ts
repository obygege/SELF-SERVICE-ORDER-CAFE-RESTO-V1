import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateUserData {
  user_insert: User_Key;
}

export interface DataPoint_Key {
  id: UUIDString;
  __typename?: 'DataPoint_Key';
}

export interface DataSeries_Key {
  id: UUIDString;
  __typename?: 'DataSeries_Key';
}

export interface GetDataSeriesByNameData {
  dataSeriess: ({
    id: UUIDString;
    name: string;
    description?: string | null;
  } & DataSeries_Key)[];
}

export interface GetDataSeriesByNameVariables {
  name: string;
}

export interface ListDataPointsData {
  dataPoints: ({
    id: UUIDString;
    value: number;
    recordedAt: TimestampString;
    notes?: string | null;
  } & DataPoint_Key)[];
}

export interface UpdateDataSeriesDescriptionData {
  dataSeries_update?: DataSeries_Key | null;
}

export interface UpdateDataSeriesDescriptionVariables {
  id: UUIDString;
  description?: string | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(): MutationPromise<CreateUserData, undefined>;
export function createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface ListDataPointsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDataPointsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListDataPointsData, undefined>;
  operationName: string;
}
export const listDataPointsRef: ListDataPointsRef;

export function listDataPoints(): QueryPromise<ListDataPointsData, undefined>;
export function listDataPoints(dc: DataConnect): QueryPromise<ListDataPointsData, undefined>;

interface UpdateDataSeriesDescriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateDataSeriesDescriptionVariables): MutationRef<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateDataSeriesDescriptionVariables): MutationRef<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;
  operationName: string;
}
export const updateDataSeriesDescriptionRef: UpdateDataSeriesDescriptionRef;

export function updateDataSeriesDescription(vars: UpdateDataSeriesDescriptionVariables): MutationPromise<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;
export function updateDataSeriesDescription(dc: DataConnect, vars: UpdateDataSeriesDescriptionVariables): MutationPromise<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;

interface GetDataSeriesByNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDataSeriesByNameVariables): QueryRef<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetDataSeriesByNameVariables): QueryRef<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
  operationName: string;
}
export const getDataSeriesByNameRef: GetDataSeriesByNameRef;

export function getDataSeriesByName(vars: GetDataSeriesByNameVariables): QueryPromise<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
export function getDataSeriesByName(dc: DataConnect, vars: GetDataSeriesByNameVariables): QueryPromise<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;

