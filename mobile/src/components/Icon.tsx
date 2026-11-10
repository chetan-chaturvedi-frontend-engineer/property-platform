import React from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { colors } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 18, color = colors.primary }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
