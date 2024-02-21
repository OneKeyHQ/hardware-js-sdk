import { Card, H2, H3, Stack, Text } from 'tamagui';

export interface PanelViewProps {
  title?: string;
  children?: React.ReactNode;
}

const PanelView = ({ title, children }: PanelViewProps) => (
  <Card flex={1} elevate size="$4" bordered padding="$2" marginTop="$2" backgroundColor="$bgApp">
    {!!title && (
      <Card.Header padded>
        <Text fontWeight="bold">{title}</Text>
      </Card.Header>
    )}
    <Card.Footer padded flexDirection="column" gap="$2">
      {children}
    </Card.Footer>
  </Card>
);

export default PanelView;
