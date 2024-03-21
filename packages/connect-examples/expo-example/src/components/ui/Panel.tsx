import { Card, Text } from 'tamagui';

export interface PanelViewProps {
  title?: string;
  children?: React.ReactNode;
  renderRight?: () => React.ReactNode;
}

const PanelView = ({ title, children, renderRight }: PanelViewProps) => (
  <Card flex={1} elevate size="$4" bordered padding="$2" marginTop="$2" backgroundColor="$bgApp">
    {!!title && (
      <Card.Header padded flexDirection="row" justifyContent="space-between">
        <Text fontWeight="bold">{title}</Text>
        {renderRight && renderRight()}
      </Card.Header>
    )}
    <Card.Footer padded flexDirection="column" gap="$2">
      {children}
    </Card.Footer>
  </Card>
);

export default PanelView;
