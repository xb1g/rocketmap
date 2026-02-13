import { Card, Button, Badge, Heading, Text, Flex, Box } from "@radix-ui/themes";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-4 py-8">
          <Heading size="9" className="holographic-bg bg-clip-text text-transparent">
            RocketMap
          </Heading>
          <Text size="5" className="text-foreground-muted">
            Playable Business Model Engine
          </Text>
        </header>

        <section className="space-y-6">
          <Heading size="6">Chromatic Theme Showcase</Heading>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Calm State Card */}
            <Card className="glow-calm state-transition hover:glow-healthy">
              <Flex direction="column" gap="3">
                <Badge color="gray">Calm State</Badge>
                <Heading size="4">Default Block</Heading>
                <Text size="2" className="text-foreground-muted">
                  This is a calm block in its default state. Subtle and focused.
                </Text>
              </Flex>
            </Card>

            {/* Healthy State Card */}
            <Card className="chromatic-border glow-healthy">
              <Flex direction="column" gap="3">
                <Badge color="jade">Healthy</Badge>
                <Heading size="4">Validated Block</Heading>
                <Text size="2">
                  This block is healthy with subtle iridescent shimmer.
                </Text>
              </Flex>
            </Card>

            {/* Warning State Card */}
            <Card className="chromatic-border-animated glow-warning">
              <Flex direction="column" gap="3">
                <Badge color="amber">Warning</Badge>
                <Heading size="4">Fragile Block</Heading>
                <Text size="2">
                  This block shows warning signs with amber highlights.
                </Text>
              </Flex>
            </Card>

            {/* Critical State Card */}
            <Card className="chromatic-border-animated glow-critical">
              <Flex direction="column" gap="3">
                <Badge color="crimson">Critical</Badge>
                <Heading size="4">At Risk Block</Heading>
                <Text size="2">
                  Critical state with pulsing chromatic effects demanding attention.
                </Text>
              </Flex>
            </Card>

            {/* AI Analysis Card */}
            <Card className="glass-morphism glow-ai">
              <Flex direction="column" gap="3">
                <Badge color="iris">AI Analysis</Badge>
                <Heading size="4">AI Processing</Heading>
                <Text size="2">
                  Active AI analysis with cyan-purple holographic gradient.
                </Text>
              </Flex>
            </Card>

            {/* Holographic Card */}
            <Box className="holographic-strong rounded-xl p-6 state-transition-slow">
              <Flex direction="column" gap="3">
                <Badge color="violet">Holographic</Badge>
                <Heading size="4" className="text-white">
                  Full Chromatic
                </Heading>
                <Text size="2" className="text-white/90">
                  Maximum chromatic effect with conic gradient background.
                </Text>
              </Flex>
            </Box>
          </div>
        </section>

        <section className="space-y-6">
          <Heading size="6">Interactive Elements</Heading>

          <Flex gap="4" wrap="wrap">
            <Button size="3" color="iris">
              Primary Action
            </Button>
            <Button size="3" variant="soft" color="amber">
              Warning Action
            </Button>
            <Button size="3" variant="outline" color="crimson">
              Critical Action
            </Button>
            <Button size="3" variant="surface" color="jade">
              Success Action
            </Button>
          </Flex>
        </section>

        <section className="space-y-6">
          <Heading size="6">Business Model Canvas Preview</Heading>

          <div className="grid grid-cols-3 gap-4">
            {[
              { title: "Key Partners", state: "calm" },
              { title: "Key Activities", state: "healthy" },
              { title: "Value Propositions", state: "ai" },
              { title: "Customer Relations", state: "warning" },
              { title: "Customer Segments", state: "calm" },
              { title: "Key Resources", state: "healthy" },
              { title: "Channels", state: "calm" },
              { title: "Cost Structure", state: "critical" },
              { title: "Revenue Streams", state: "warning" },
            ].map((block, idx) => {
              const glowClass = `glow-${block.state}`;
              const borderClass = block.state !== "calm" ? "chromatic-border" : "";

              return (
                <Card
                  key={idx}
                  className={`${glowClass} ${borderClass} state-transition hover:scale-105 cursor-pointer`}
                >
                  <Flex direction="column" gap="2">
                    <Text size="1" className="text-foreground-muted uppercase">
                      BMC Block
                    </Text>
                    <Heading size="3">{block.title}</Heading>
                  </Flex>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
