import LinearRegressionDemo from '../../components/visualizations/linear-regression/LinearRegressionDemo';
import type { VisualizationProps } from '../client-registry';

export default function BestFitDemo({ accent }: VisualizationProps) {
  return <LinearRegressionDemo accent={accent} focus="best-fit" />;
}
