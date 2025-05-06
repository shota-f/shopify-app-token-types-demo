/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type RunProductsQueryVariables = AdminTypes.Exact<{
  first: AdminTypes.Scalars['Int']['input'];
}>;


export type RunProductsQuery = { products: { nodes: Array<Pick<AdminTypes.Product, 'id' | 'title'>> } };

interface GeneratedQueryTypes {
  "#graphql\nquery RunProducts($first: Int!) {\n  products(first: $first) {\n    nodes {\n      id\n      title\n    }\n  }\n}\n": {return: RunProductsQuery, variables: RunProductsQueryVariables},
}

interface GeneratedMutationTypes {
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
