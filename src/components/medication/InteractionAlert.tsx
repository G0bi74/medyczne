import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrugInteraction, InteractionSeverity } from '../../types';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';

interface InteractionAlertProps {
  interaction: DrugInteraction;
  onDismiss?: () => void;
  onLearnMore?: () => void;
}

export const InteractionAlert: React.FC<InteractionAlertProps> = ({
  interaction,
  onDismiss,
  onLearnMore,
}) => {
  const getSeverityColor = (severity: InteractionSeverity): string => {
    switch (severity) {
      case 'critical':
        return Colors.severity.critical;
      case 'high':
        return Colors.severity.high;
      case 'medium':
        return Colors.severity.medium;
      default:
        return Colors.severity.low;
    }
  };

  const getSeverityLabel = (severity: InteractionSeverity): string => {
    switch (severity) {
      case 'critical':
        return 'KRYTYCZNE';
      case 'high':
        return 'WYSOKIE RYZYKO';
      case 'medium':
        return 'ŚREDNIE RYZYKO';
      default:
        return 'NISKIE RYZYKO';
    }
  };

  const getSeverityIcon = (severity: InteractionSeverity): keyof typeof Ionicons.glyphMap => {
    switch (severity) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      case 'medium':
        return 'alert';
      default:
        return 'information-circle';
    }
  };

  const color = getSeverityColor(interaction.severity);
  const isCritical = interaction.severity === 'critical' || interaction.severity === 'high';

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.header, { backgroundColor: color + '15' }]}>
        <View style={styles.severityBadge}>
          <Ionicons name={getSeverityIcon(interaction.severity)} size={20} color={color} />
          <Text style={[styles.severityText, { color }]}>
            {getSeverityLabel(interaction.severity)}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.substances}>
          <Text style={styles.substanceText}>{interaction.substance1}</Text>
          <View style={styles.interactionIcon}>
            <Ionicons name="git-compare-outline" size={20} color={color} />
          </View>
          <Text style={styles.substanceText}>{interaction.substance2}</Text>
        </View>

        <Text style={styles.description}>{interaction.description}</Text>

        <View style={styles.recommendation}>
          <Ionicons name="medkit-outline" size={18} color={Colors.primary[600]} />
          <Text style={styles.recommendationText}>{interaction.recommendation}</Text>
        </View>

        {isCritical && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={18} color={Colors.error} />
            <Text style={styles.warningText}>
              Skonsultuj się z lekarzem lub farmaceutą przed przyjęciem tych leków jednocześnie.
            </Text>
          </View>
        )}
      </View>

      {onLearnMore && (
        <TouchableOpacity style={styles.learnMoreButton} onPress={onLearnMore}>
          <Text style={styles.learnMoreText}>Dowiedz się więcej</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  severityText: {
    ...Typography.small,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: 4,
  },
  content: {
    padding: Spacing.md,
  },
  substances: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  substanceText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  interactionIcon: {
    padding: Spacing.xs,
  },
  description: {
    ...Typography.body,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary[50],
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  recommendationText: {
    ...Typography.caption,
    color: Colors.primary[700],
    flex: 1,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.error + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
    fontWeight: '500',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    gap: Spacing.xs,
  },
  learnMoreText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
});

export default InteractionAlert;
