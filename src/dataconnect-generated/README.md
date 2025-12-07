# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListDataPoints*](#listdatapoints)
  - [*GetDataSeriesByName*](#getdataseriesbyname)
- [**Mutations**](#mutations)
  - [*CreateUser*](#createuser)
  - [*UpdateDataSeriesDescription*](#updatedataseriesdescription)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListDataPoints
You can execute the `ListDataPoints` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listDataPoints(): QueryPromise<ListDataPointsData, undefined>;

interface ListDataPointsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDataPointsData, undefined>;
}
export const listDataPointsRef: ListDataPointsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDataPoints(dc: DataConnect): QueryPromise<ListDataPointsData, undefined>;

interface ListDataPointsRef {
  ...
  (dc: DataConnect): QueryRef<ListDataPointsData, undefined>;
}
export const listDataPointsRef: ListDataPointsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDataPointsRef:
```typescript
const name = listDataPointsRef.operationName;
console.log(name);
```

### Variables
The `ListDataPoints` query has no variables.
### Return Type
Recall that executing the `ListDataPoints` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDataPointsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDataPointsData {
  dataPoints: ({
    id: UUIDString;
    value: number;
    recordedAt: TimestampString;
    notes?: string | null;
  } & DataPoint_Key)[];
}
```
### Using `ListDataPoints`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDataPoints } from '@dataconnect/generated';


// Call the `listDataPoints()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDataPoints();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDataPoints(dataConnect);

console.log(data.dataPoints);

// Or, you can use the `Promise` API.
listDataPoints().then((response) => {
  const data = response.data;
  console.log(data.dataPoints);
});
```

### Using `ListDataPoints`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDataPointsRef } from '@dataconnect/generated';


// Call the `listDataPointsRef()` function to get a reference to the query.
const ref = listDataPointsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDataPointsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dataPoints);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dataPoints);
});
```

## GetDataSeriesByName
You can execute the `GetDataSeriesByName` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getDataSeriesByName(vars: GetDataSeriesByNameVariables): QueryPromise<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;

interface GetDataSeriesByNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDataSeriesByNameVariables): QueryRef<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
}
export const getDataSeriesByNameRef: GetDataSeriesByNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getDataSeriesByName(dc: DataConnect, vars: GetDataSeriesByNameVariables): QueryPromise<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;

interface GetDataSeriesByNameRef {
  ...
  (dc: DataConnect, vars: GetDataSeriesByNameVariables): QueryRef<GetDataSeriesByNameData, GetDataSeriesByNameVariables>;
}
export const getDataSeriesByNameRef: GetDataSeriesByNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getDataSeriesByNameRef:
```typescript
const name = getDataSeriesByNameRef.operationName;
console.log(name);
```

### Variables
The `GetDataSeriesByName` query requires an argument of type `GetDataSeriesByNameVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetDataSeriesByNameVariables {
  name: string;
}
```
### Return Type
Recall that executing the `GetDataSeriesByName` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetDataSeriesByNameData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetDataSeriesByNameData {
  dataSeriess: ({
    id: UUIDString;
    name: string;
    description?: string | null;
  } & DataSeries_Key)[];
}
```
### Using `GetDataSeriesByName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getDataSeriesByName, GetDataSeriesByNameVariables } from '@dataconnect/generated';

// The `GetDataSeriesByName` query requires an argument of type `GetDataSeriesByNameVariables`:
const getDataSeriesByNameVars: GetDataSeriesByNameVariables = {
  name: ..., 
};

// Call the `getDataSeriesByName()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getDataSeriesByName(getDataSeriesByNameVars);
// Variables can be defined inline as well.
const { data } = await getDataSeriesByName({ name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getDataSeriesByName(dataConnect, getDataSeriesByNameVars);

console.log(data.dataSeriess);

// Or, you can use the `Promise` API.
getDataSeriesByName(getDataSeriesByNameVars).then((response) => {
  const data = response.data;
  console.log(data.dataSeriess);
});
```

### Using `GetDataSeriesByName`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getDataSeriesByNameRef, GetDataSeriesByNameVariables } from '@dataconnect/generated';

// The `GetDataSeriesByName` query requires an argument of type `GetDataSeriesByNameVariables`:
const getDataSeriesByNameVars: GetDataSeriesByNameVariables = {
  name: ..., 
};

// Call the `getDataSeriesByNameRef()` function to get a reference to the query.
const ref = getDataSeriesByNameRef(getDataSeriesByNameVars);
// Variables can be defined inline as well.
const ref = getDataSeriesByNameRef({ name: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getDataSeriesByNameRef(dataConnect, getDataSeriesByNameVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dataSeriess);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dataSeriess);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUser(): MutationPromise<CreateUserData, undefined>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface CreateUserRef {
  ...
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation has no variables.
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser } from '@dataconnect/generated';


// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser().then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef } from '@dataconnect/generated';


// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## UpdateDataSeriesDescription
You can execute the `UpdateDataSeriesDescription` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateDataSeriesDescription(vars: UpdateDataSeriesDescriptionVariables): MutationPromise<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;

interface UpdateDataSeriesDescriptionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateDataSeriesDescriptionVariables): MutationRef<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;
}
export const updateDataSeriesDescriptionRef: UpdateDataSeriesDescriptionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateDataSeriesDescription(dc: DataConnect, vars: UpdateDataSeriesDescriptionVariables): MutationPromise<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;

interface UpdateDataSeriesDescriptionRef {
  ...
  (dc: DataConnect, vars: UpdateDataSeriesDescriptionVariables): MutationRef<UpdateDataSeriesDescriptionData, UpdateDataSeriesDescriptionVariables>;
}
export const updateDataSeriesDescriptionRef: UpdateDataSeriesDescriptionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateDataSeriesDescriptionRef:
```typescript
const name = updateDataSeriesDescriptionRef.operationName;
console.log(name);
```

### Variables
The `UpdateDataSeriesDescription` mutation requires an argument of type `UpdateDataSeriesDescriptionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateDataSeriesDescriptionVariables {
  id: UUIDString;
  description?: string | null;
}
```
### Return Type
Recall that executing the `UpdateDataSeriesDescription` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateDataSeriesDescriptionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateDataSeriesDescriptionData {
  dataSeries_update?: DataSeries_Key | null;
}
```
### Using `UpdateDataSeriesDescription`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateDataSeriesDescription, UpdateDataSeriesDescriptionVariables } from '@dataconnect/generated';

// The `UpdateDataSeriesDescription` mutation requires an argument of type `UpdateDataSeriesDescriptionVariables`:
const updateDataSeriesDescriptionVars: UpdateDataSeriesDescriptionVariables = {
  id: ..., 
  description: ..., // optional
};

// Call the `updateDataSeriesDescription()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateDataSeriesDescription(updateDataSeriesDescriptionVars);
// Variables can be defined inline as well.
const { data } = await updateDataSeriesDescription({ id: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateDataSeriesDescription(dataConnect, updateDataSeriesDescriptionVars);

console.log(data.dataSeries_update);

// Or, you can use the `Promise` API.
updateDataSeriesDescription(updateDataSeriesDescriptionVars).then((response) => {
  const data = response.data;
  console.log(data.dataSeries_update);
});
```

### Using `UpdateDataSeriesDescription`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateDataSeriesDescriptionRef, UpdateDataSeriesDescriptionVariables } from '@dataconnect/generated';

// The `UpdateDataSeriesDescription` mutation requires an argument of type `UpdateDataSeriesDescriptionVariables`:
const updateDataSeriesDescriptionVars: UpdateDataSeriesDescriptionVariables = {
  id: ..., 
  description: ..., // optional
};

// Call the `updateDataSeriesDescriptionRef()` function to get a reference to the mutation.
const ref = updateDataSeriesDescriptionRef(updateDataSeriesDescriptionVars);
// Variables can be defined inline as well.
const ref = updateDataSeriesDescriptionRef({ id: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateDataSeriesDescriptionRef(dataConnect, updateDataSeriesDescriptionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.dataSeries_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.dataSeries_update);
});
```

