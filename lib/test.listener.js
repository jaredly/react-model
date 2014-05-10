
var fixtures = [
  [
    {one: {$set: 34}},
    {one: {$set: 10}},
    {one: {$set: 10}}
  ],
  [
    {one: {$set: {awesome: 23}}},
    {one: {two: {$set: 10}}},
    {one: {$set: {awesome: 23, two: 10}}}
  ],
  [
    {one: {$set: 34}},
    {two: {$set: 10}},
    {one: {$set: 34}, two: {$set: 10}}
  ]
]

