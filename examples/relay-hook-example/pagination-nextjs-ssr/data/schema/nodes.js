/* eslint-disable @typescript-eslint/explicit-function-return-type */
// @flow
/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
    GraphQLBoolean,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from 'graphql';

import {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
    fromGlobalId,
    globalIdField,
    nodeDefinitions,
} from 'graphql-relay';

import { User, getTodos, getUserOrThrow } from '../database';

// $FlowFixMe graphql-relay types not available in flow-typed, strengthen this typing
const { nodeInterface, nodeField } = nodeDefinitions(
    (globalId) => {
        const { type, id } = fromGlobalId(globalId);
        if (type === 'User') {
            return getUserOrThrow(id);
        }
        return null;
    },
    (obj) => {
        if (obj instanceof User) {
            return GraphQLUser;
        }
        return null;
    },
);

const GraphQLTodo = new GraphQLObjectType({
    name: 'Todo',
    fields: {
        id: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: (todo) => todo.id,
        },
        text: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: (todo) => todo.text,
        },
        complete: {
            type: new GraphQLNonNull(GraphQLBoolean),
            resolve: (todo) => todo.complete,
        },
    },
});

const { connectionType: TodosConnection, edgeType: GraphQLTodoEdge } = connectionDefinitions({
    name: 'Todo',
    nodeType: GraphQLTodo,
});

const GraphQLUser = new GraphQLObjectType({
    name: 'User',
    fields: {
        id: globalIdField('User'),
        userId: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: ({ id }) => id,
        },
        todos: {
            type: TodosConnection,
            args: {
                status: {
                    type: GraphQLString,
                    defaultValue: 'any',
                },
                ...connectionArgs,
            },
            resolve: ({ id }, connectionsProps) => {
                const { status, after, before, first, last } = connectionsProps;
                return connectionFromArray([...getTodos(id, status)], {
                    after,
                    before,
                    first,
                    last,
                });
            },
        },
        totalCount: {
            type: new GraphQLNonNull(GraphQLInt),
            resolve: ({ id }) => getTodos(id).length,
        },
        completedCount: {
            type: new GraphQLNonNull(GraphQLInt),
            resolve: ({ id }) => getTodos(id, 'completed').length,
        },
    },
    interfaces: [nodeInterface],
});

export { nodeField, GraphQLTodo, GraphQLTodoEdge, GraphQLUser };
