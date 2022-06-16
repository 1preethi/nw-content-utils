// Button.stories.ts|tsx

import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import McqPoolBuilder from './McqPoolBuilder'

export default {
    /* 👇 The title prop is optional.
    * See https://storybook.js.org/docs/react/configure/overview#configure-story-loading
    * to learn how to generate automatic titles
    */
    title: 'McqPoolBuilder',
    component: McqPoolBuilder,
} as ComponentMeta<typeof McqPoolBuilder>;

export const Primary: ComponentStory<typeof McqPoolBuilder> = () => <McqPoolBuilder />;