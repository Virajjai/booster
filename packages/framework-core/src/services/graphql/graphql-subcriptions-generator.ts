import { GraphQLFieldConfigMap, GraphQLFieldResolver, GraphQLObjectType } from 'graphql'
import { TargetTypesMap } from './common'
import { GraphQLTypeInformer } from './graphql-type-informer'
import { AnyClass, GraphQLRequestEnvelope } from '@boostercloud/framework-types'
import { GraphQLQueryGenerator } from './graphql-query-generator'

export type MutationResolverBuilder = (
  readModelClass: AnyClass
) => GraphQLFieldResolver<any, GraphQLRequestEnvelope, any>

export class GraphQLSubscriptionGenerator {
  public constructor(
    private readonly targetTypes: TargetTypesMap,
    private readonly typeInformer: GraphQLTypeInformer,
    private readonly queryGenerator: GraphQLQueryGenerator,
    private readonly resolverBuilder: MutationResolverBuilder
  ) {}

  public generate(): GraphQLObjectType {
    return new GraphQLObjectType({
      name: 'Subscription',
      fields: this.generateSubscriptions(),
    })
  }

  private generateSubscriptions(): GraphQLFieldConfigMap<any, any> {
    const subscriptions: GraphQLFieldConfigMap<any, any> = {}
    for (const name in this.targetTypes) {
      const type = this.targetTypes[name]
      const graphQLType = this.typeInformer.getGraphQLTypeFor(type.class)
      subscriptions[name] = {
        type: graphQLType,
        args: this.queryGenerator.generateFilterArguments(type),
        resolve: this.resolverBuilder(type.class),
      }
    }
    return subscriptions
  }
}
