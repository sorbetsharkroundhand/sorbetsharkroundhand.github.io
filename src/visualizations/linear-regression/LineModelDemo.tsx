import LinearRegressionDemo from '../../components/visualizations/linear-regression/LinearRegressionDemo';
import type { VisualizationProps } from '../client-registry';

export default function LineModelDemo({ accent }: VisualizationProps) {
  return <LinearRegressionDemo accent={accent} focus="model" />;
}
