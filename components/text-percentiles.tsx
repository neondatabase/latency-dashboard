import { Badge } from '@tremor/react';

export default function TextPercentiles() {
  return <>
    <Badge className='font-normal ml-1 mr-1' color='green'>5th</Badge>
    <Badge className='font-normal ml-1 mr-1' color='gray'>25th</Badge>
    <Badge className='font-normal ml-1 mr-1' color='blue'>50th</Badge>
    <Badge className='font-normal ml-1 mr-1' color='gray'>75th</Badge>
    <Badge className='font-normal ml-1 mr-1' color='orange'>95th</Badge>
  </>;
};
