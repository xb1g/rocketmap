import type { BlockDefinition } from '@/lib/types/canvas';

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'key_partnerships',
    bmcLabel: 'Key Partners',
    leanLabel: 'Problem',
    gridCol: '1 / 3',
    gridRow: '1 / 3',
  },
  {
    type: 'key_activities',
    bmcLabel: 'Key Activities',
    leanLabel: 'Solution',
    gridCol: '3 / 5',
    gridRow: '1 / 2',
  },
  {
    type: 'key_resources',
    bmcLabel: 'Key Resources',
    leanLabel: 'Key Metrics',
    gridCol: '3 / 5',
    gridRow: '2 / 3',
  },
  {
    type: 'value_prop',
    bmcLabel: 'Value Propositions',
    leanLabel: 'Unique Value Proposition',
    gridCol: '5 / 7',
    gridRow: '1 / 3',
  },
  {
    type: 'customer_relationships',
    bmcLabel: 'Customer Relationships',
    leanLabel: 'Unfair Advantage',
    gridCol: '7 / 9',
    gridRow: '1 / 2',
  },
  {
    type: 'channels',
    bmcLabel: 'Channels',
    leanLabel: null,
    gridCol: '7 / 9',
    gridRow: '2 / 3',
  },
  {
    type: 'customer_segments',
    bmcLabel: 'Customer Segments',
    leanLabel: null,
    gridCol: '9 / 11',
    gridRow: '1 / 3',
  },
  {
    type: 'cost_structure',
    bmcLabel: 'Cost Structure',
    leanLabel: null,
    gridCol: '1 / 6',
    gridRow: '3 / 4',
  },
  {
    type: 'revenue_streams',
    bmcLabel: 'Revenue Streams',
    leanLabel: null,
    gridCol: '6 / 11',
    gridRow: '3 / 4',
  },
];
