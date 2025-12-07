import { CreateUserData, ListDataPointsData, UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables, GetDataSeriesByNameData, GetDataSeriesByNameVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;

export function useListDataPoints(options?: useDataConnectQueryOptions<ListDataPointsData>): UseDataConnectQueryResult<ListDataPointsData, undefined>;
export function useListDataPoints(dc: DataConnect, options?: useDataConnectQueryOptions<ListDataPointsData>): UseDataConnectQueryResult<ListDataPointsData, undefined>;

export function useUpdateDataSeriesDescription(options?: useDataConnectMutationOptions<UpdateDataSeriesDescriptionData, FirebaseError, UpdateDataSeriesDescriptionVariables>): UseDataConnectMutationResult<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;
export function useUpdateDataSeriesDescription(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateDataSeriesDescriptionData, FirebaseError, UpdateDataSeriesDescriptionVariables>): UseDataConnectMutationResult<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;

export function useGetDataSeriesByName(vars: GetDataSeriesByNameVariables, options?: useDataConnectQueryOptions<GetDataSeriesByNameData>): UseDataConnectQueryResult<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
export function useGetDataSeriesByName(dc: DataConnect, vars: GetDataSeriesByNameVariables, options?: useDataConnectQueryOptions<GetDataSeriesByNameData>): UseDataConnectQueryResult<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
