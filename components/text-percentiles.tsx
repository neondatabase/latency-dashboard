import { Badge } from '@tremor/react';

export default function TextPercentiles() {
  return <>
    <Badge className='font-normal ml-1 mr-1' color='green'>5</Badge>
    <Badge className='font-normal ml-1 mr-1' color='gray'>25</Badge>
    <Badge className='font-normal ml-1 mr-1' color='blue'>50</Badge>
    <Badge className='font-normal ml-1 mr-1' color='gray'>75</Badge>
    <Badge className='font-normal ml-1 mr-1' color='orange'>95</Badge>
  </>;
};
