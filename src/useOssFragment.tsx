import * as warning from 'fbjs/lib/warning';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { GraphQLTaggedNode, getFragmentIdentifier, getFragment } from 'relay-runtime';
import { FragmentResolver } from './FragmentResolver';
import { FragmentNames } from './RelayHooksTypes';
import { useForceUpdate } from './useForceUpdate';
import { useRelayEnvironment } from './useRelayEnvironment';

export function useOssFragment(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: any | null,
    suspense: boolean,
    name: FragmentNames,
    subscribe?: (data: any) => void,
): any {
    const environment = useRelayEnvironment();
    const forceUpdate = useForceUpdate();
    const ref = useRef<{ resolver: FragmentResolver }>(null);
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            resolver: new FragmentResolver(name),
        };
    }

    const { resolver } = ref.current;

    useEffect(() => {
        return (): void => {
            ref.current.resolver.setUnmounted();
        };
    }, []);

    useEffect(() => {
        return (): void => {
            resolver.dispose();
        };
    }, [resolver]);

    const fragment = useMemo(() => {
        return getFragment(fragmentNode);
    }, [fragmentNode]);

    const idfragment = useMemo(() => {
        return getFragmentIdentifier(fragment, fragmentRef);
    }, [fragment, fragmentRef]);

    useEffect(() => {
        resolver.subscribe();
        return (): void => {
            resolver.unsubscribe();
        };
    }, [resolver, idfragment, environment]);

    resolver.resolve(environment, idfragment, fragment, fragmentRef);

    resolver.checkAndSuspense(suspense);

    const next = useCallback(() => {
        if (subscribe) {
            const data = resolver.getData();
            subscribe(data);
        }
    }, [subscribe, resolver, idfragment]);

    useEffect(() => {
        next();
    }, [next]);

    if (subscribe) {
        resolver.setForceUpdate(next);
        return;
    }

    resolver.setForceUpdate(forceUpdate);

    const data = resolver.getData();

    if ('production' !== process.env.NODE_ENV) {
        if (
            fragmentRef != null &&
            (data === undefined ||
                (Array.isArray(data) &&
                    data.length > 0 &&
                    data.every((data) => data === undefined)))
        ) {
            warning(
                false,
                'Relay: Expected to have been able to read non-null data for ' +
                    'fragment `%s` declared in ' +
                    '`%s`, since fragment reference was non-null. ' +
                    "Make sure that that `%s`'s parent isn't " +
                    'holding on to and/or passing a fragment reference for data that ' +
                    'has been deleted.',
                fragment,
                name,
                name,
            );
        }
    }

    return [data, resolver];
}
