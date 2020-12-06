import { GraphQLTaggedNode, OperationType, IEnvironment } from 'relay-runtime';
import { QueryFetcher } from './QueryFetcher';
import { RenderProps, QueryOptions, LoadQuery } from './RelayHooksType';
import { forceCache } from './Utils';

export const internalLoadQuery = <TOperationType extends OperationType = OperationType>(
    promise = false,
    queryExecute = (
        queryFetcher: QueryFetcher<TOperationType>,
        environment: IEnvironment,
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'] = {},
        options: QueryOptions,
    ): RenderProps<TOperationType> =>
        queryFetcher.resolve(environment, gqlQuery, variables, options),
): LoadQuery<TOperationType> => {
    let queryFetcher = new QueryFetcher<TOperationType>();
    queryFetcher.setMounted();

    const dispose = (): void => {
        queryFetcher.dispose();
        queryFetcher.setMounted(false);
        queryFetcher = new QueryFetcher<TOperationType>();
    };

    const next = (
        environment,
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'] = {},
        options: QueryOptions = {},
    ): Promise<void> => {
        options.networkCacheConfig = options.networkCacheConfig ?? forceCache;
        queryExecute(queryFetcher, environment, gqlQuery, variables, options);
        const toThrow = queryFetcher.checkAndSuspense();
        return toThrow
            ? toThrow instanceof Error
                ? Promise.reject(toThrow)
                : toThrow
            : Promise.resolve();
    };

    const getValue = (
        environment?: IEnvironment,
    ): RenderProps<TOperationType> | null | Promise<any> => {
        queryFetcher.resolveEnvironment(environment);

        queryFetcher.checkAndSuspense(promise);

        return queryFetcher.getData();
    };

    const subscribe = (callback: () => any): (() => void) => {
        queryFetcher.setForceUpdate(callback);
        return (): void => {
            queryFetcher.setForceUpdate(() => undefined);
        };
    };
    return {
        next,
        subscribe,
        getValue,
        dispose,
    };
};

export const loadLazyQuery = <
    TOperationType extends OperationType = OperationType
>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(true);
};

export const loadQuery = <
    TOperationType extends OperationType = OperationType
>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(false);
};
