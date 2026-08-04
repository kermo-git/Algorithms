export interface Example {
    name: string
    ruleNumber: bigint
    nStates: number
    neighborhoodRadius: number
    hexColors: string[]
}

export const examples: Example[] = [
    {
        name: 'Rule 30',
        ruleNumber: 30n,
        nStates: 2,
        neighborhoodRadius: 1,
        hexColors: ['#323232', '#FECB3E', '#FF87FD', '#009200']
    },
    {
        name: 'Triangles',
        ruleNumber: 6637593129346n,
        nStates: 3,
        neighborhoodRadius: 1,
        hexColors: ['#DAFFC1', '#91DB76', '#689C56', '#FFFFFF']
    },
    {
        name: 'Sharp corners',
        ruleNumber: 4234215280010n,
        nStates: 3,
        neighborhoodRadius: 1,
        hexColors: ['#E6ABFF', '#AC51E4', '#5F158B', '#FAF2FA']
    },
    {
        name: 'Vines',
        ruleNumber: 135497638344673206598927780380850347174n,
        nStates: 4,
        neighborhoodRadius: 1,
        hexColors: ['#FF87FD', '#323232', '#009200', '#FECB3E']
    },
    {
        name: 'Electrical circuit board',
        ruleNumber: 609058266n,
        nStates: 2,
        neighborhoodRadius: 2,
        hexColors: ['#FECB3E', '#007628', '#000000', '#FFFFFF']
    },
    {
        name: 'Tall buildings',
        ruleNumber: 2939828314n,
        nStates: 2,
        neighborhoodRadius: 2,
        hexColors: ['#F5CB6E', '#323232', '#000000', '#FFFFFF']
    },
    {
        name: 'City',
        ruleNumber: 9548131633201461177601464909579195651n,
        nStates: 2,
        neighborhoodRadius: 3,
        hexColors: ['#F7F6CF', '#7A7A7A', '#000000', '#FFFFFF']
    }
]
