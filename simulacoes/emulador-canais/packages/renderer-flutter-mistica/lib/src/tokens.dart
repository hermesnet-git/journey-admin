import 'package:flutter/material.dart';

@immutable
class FlutterMisticaTokens {
  const FlutterMisticaTokens({
    this.brand = const Color(0xff0066ff),
    this.onBrand = Colors.white,
    this.background = const Color(0xfff4f4f7),
    this.backgroundSecondary = const Color(0xffe9e9ef),
    this.surface = Colors.white,
    this.textPrimary = const Color(0xff24242b),
    this.textSecondary = const Color(0xff666672),
    this.border = const Color(0xffc8c8d0),
    this.negative = const Color(0xffb3261e),
    this.negativeLow = const Color(0xffffe9e7),
    this.positive = const Color(0xff18794e),
    this.positiveLow = const Color(0xffe4f7ed),
    this.warning = const Color(0xff8a5a00),
    this.warningLow = const Color(0xfffff3cf),
    this.informativeLow = const Color(0xffe7f0ff),
  });

  final Color brand;
  final Color onBrand;
  final Color background;
  final Color backgroundSecondary;
  final Color surface;
  final Color textPrimary;
  final Color textSecondary;
  final Color border;
  final Color negative;
  final Color negativeLow;
  final Color positive;
  final Color positiveLow;
  final Color warning;
  final Color warningLow;
  final Color informativeLow;

  double spacing(dynamic token) => switch (token?.toString()) {
        'spacing.none' => 0,
        'spacing.xs' => 4,
        'spacing.sm' => 8,
        'spacing.lg' => 24,
        'spacing.xl' => 32,
        _ => 16,
      };

  double maxWidth(dynamic token) => switch (token?.toString()) {
        'layout.content.compact' => 480,
        'layout.content.wide' => 1120,
        _ => 760,
      };

  double iconSize(dynamic token) => switch (token?.toString()) {
        'size.icon.sm' => 18,
        'size.icon.lg' => 32,
        _ => 24,
      };

  Color color(dynamic token, {Color? fallback}) => switch (token?.toString()) {
        'color.background.primary' => background,
        'color.background.secondary' => backgroundSecondary,
        'color.surface' => surface,
        'color.text.primary' => textPrimary,
        'color.text.secondary' => textSecondary,
        'color.brand' || 'color.brand.primary' => brand,
        'color.feedback.negative' => negative,
        'color.feedback.positive' => positive,
        'color.feedback.warning' => warning,
        _ => fallback ?? textPrimary,
      };
}

