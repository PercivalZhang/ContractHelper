import 'cross-fetch/polyfill';
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'


export const client = new ApolloClient({
    link: new HttpLink({
        uri: 'https://www.capricorn.finance/subgraphs/name/cube/dex-subgraph'
    }),
    cache: new InMemoryCache(),
})

export const blockClient = new ApolloClient({
    link: new HttpLink({
        uri: 'https://www.capricorn.finance/subgraphs/name/blocklytics/ethereum-blocks',
    }),
    cache: new InMemoryCache(),
})

