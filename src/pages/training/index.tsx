import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { TRAINING_PLANS, EMERGENCY_RULES } from '@/data/training';
import { useAppStore } from '@/store/app';
import { getRiskLevelText, BODY_PART_NAMES } from '@/utils/risk';
import { PlanType, ReminderType } from '@/types';

type PlanTab = PlanType;

const TABS: { key: PlanTab; name: string; icon: string }[] = [
  { key: 'rest', name: '休息建议', icon: '😴' },
  { key: 'alternative', name: '替代训练', icon: '🔄' },
  { key: 'recovery', name: '复训计划', icon: '💪' }
];

const TYPE_NAMES: Record<ReminderType, string> = {
  rest: '休息',
  alternative: '替代训练',
  recovery: '康复训练',
  training: '常规训练',
  check: '检查评估'
};

const PLAN_TYPE_NAMES: Record<PlanType, string> = {
  rest: '休息方案',
  alternative: '替代训练',
  recovery: '复训计划'
};

const today = new Date().toISOString().split('T')[0];

const formatDateLabel = (d: string): string => {
  if (d === today) return '今天';
  const t = new Date(today);
  const target = new Date(d);
  const diff = Math.round((target.getTime() - t.getTime()) / 86400000);
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff === -1) return '昨天';
  return d;
};

const TrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlanTab>('rest');
  const {
    reminders,
    toggleReminder,
    updateReminderDate,
    deleteReminder,
    addReminder,
    getSmartRecommendations,
    getLatestRiskLevel,
    getLatestPainfulParts,
    getRecoveryStatusSummary
  } = useAppStore();

  const smartRecs = useMemo(() => getSmartRecommendations(), [
    reminders.length,
    getLatestRiskLevel(),
    getLatestPainfulParts().length,
    getRecoveryStatusSummary()
  ]);

  const latestRisk = getLatestRiskLevel();
  const painfulParts = getLatestPainfulParts();
  const recoverySummary = getRecoveryStatusSummary();

  const filteredPlans = TRAINING_PLANS.filter(p => p.type === activeTab);

  const getIntensityTag = (i: string) => ({
    low: { text: '低强度', color: '#10B981', bg: '#ECFDF5' },
    medium: { text: '中强度', color: '#F59E0B', bg: '#FEF3C7' },
    high: { text: '高强度', color: '#EF4444', bg: '#FEE2E2' }
  }[i] || { text: i, color: '#64748B', bg: '#F1F5F9' });

  const addPlanToSchedule = (planId: string) => {
    const plan = TRAINING_PLANS.find(p => p.id === planId);
    if (!plan) return;

    const reminderType: ReminderType = plan.type;

    Taro.showModal({
      title: '加入训练日程',
      content: `将「${plan.title}」添加为${PLAN_TYPE_NAMES[plan.type]}提醒，明天执行。可以在日程中调整日期。`,
      confirmText: '确认添加',
      confirmColor: '#F97316',
      success: (res) => {
        if (res.confirm) {
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          addReminder({
            date: tomorrow,
            title: plan.title,
            description: plan.description,
            type: reminderType,
            planType: plan.type
          });
          Taro.showToast({ title: '已加入日程', icon: 'success' });
          Taro.vibrateShort({ type: 'medium' });
        }
      }
    });
  };

  const handleToggleReminder = (id: string) => {
    toggleReminder(id);
    Taro.vibrateShort({ type: 'light' });
  };

  const handleChangeDate = (id: string, currentDate: string, title: string) => {
    const todayTs = new Date(today).getTime();
    const dates: { key: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const ts = todayTs + i * 86400000;
      const d = new Date(ts).toISOString().split('T')[0];
      dates.push({ key: d, label: formatDateLabel(d) + ` (${d})` });
    }

    Taro.showActionSheet({
      itemList: dates.map(d => d.label),
      success: (res) => {
        const newDate = dates[res.tapIndex].key;
        updateReminderDate(id, newDate);
        Taro.showToast({ title: `已调整到${formatDateLabel(newDate)}`, icon: 'success' });
      }
    });
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除提醒',
      content: '确认删除这条日程提醒？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          deleteReminder(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const handleEmergency = () => {
    Taro.makePhoneCall({ phoneNumber: '120' }).catch(() => {
      Taro.showToast({ title: '拨号取消', icon: 'none' });
    });
  };

  const remindersSorted = [...reminders]
    .filter(r => {
      const rDate = new Date(r.date).getTime();
      const tDate = new Date(today).getTime();
      return rDate >= tDate - 86400000;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>📋 智能训练计划</Text>
        <Text className={styles.headerSubtitle}>根据您当前的风险等级、疼痛部位和恢复状态，智能推荐最适合的训练方案</Text>
        <View className={styles.statusRow}>
          <View className={classnames(styles.statusBadge, latestRisk && styles.statusBadgeStrong)}>
            🎯 {latestRisk ? getRiskLevelText(latestRisk) : '暂无风险数据'}
          </View>
          {painfulParts.length > 0 && (
            <View className={classnames(styles.statusBadge, styles.statusBadgeStrong)}>
              📍 {painfulParts.slice(0, 3).map(p => BODY_PART_NAMES[p]).join('、')}{painfulParts.length > 3 ? '等' : ''}不适
            </View>
          )}
          {(recoverySummary.improving + recoverySummary.recovered > 0) && (
            <View className={styles.statusBadge}>
              ✅ {recoverySummary.improving + recoverySummary.recovered}项好转中
            </View>
          )}
        </View>
      </View>

      <View className={styles.smartSection}>
        <Text className={styles.smartTitle}>
          🤖 AI 智能推荐
          {smartRecs.length > 0 && <Text style={{ fontSize: 22, fontWeight: 400, opacity: 0.7 }}>  · 为您匹配 {smartRecs.length} 个方案</Text>}
        </Text>
        <Text className={styles.smartDesc}>
          基于最新风险评估、疼痛部位和恢复状态综合计算，推荐优先级最高的训练方案
        </Text>

        {smartRecs.length > 0 ? smartRecs.map((rec, idx) => {
          const plan = TRAINING_PLANS.find(p => p.id === rec.planId);
          if (!plan) return null;
          return (
            <View key={rec.planId} className={styles.recCard}>
              <View className={styles.recTop}>
                <Text className={styles.recName}>
                  {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '}{plan.title}
                </Text>
                <View className={styles.recPriority}>匹配度 {Math.min(rec.priority, 100)}%</View>
              </View>
              <Text className={styles.recReason}>{rec.reason}</Text>
              <Button
                className={styles.recAddBtn}
                onClick={() => addPlanToSchedule(plan.id)}
              >
                + 一键加入日程
              </Button>
            </View>
          );
        }) : (
          <View style={{ padding: 24, textAlign: 'center', color: '#92400E', fontSize: 26, background: '#fff', borderRadius: 12 }}>
            暂无足够数据生成推荐，请先完成风险自测或记录疼痛情况
          </View>
        )}
      </View>

      <View className={styles.tabBar}>
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, { [styles.active]: activeTab === tab.key })}
            onClick={() => { setActiveTab(tab.key); Taro.vibrateShort({ type: 'light' }); }}
          >
            {tab.icon} {tab.name}
          </View>
        ))}
      </View>

      {filteredPlans.map(plan => {
        const iTag = getIntensityTag(plan.intensity);
        return (
          <View key={plan.id} className={classnames(styles.planCard, styles[plan.type])}>
            <View className={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text className={styles.planTitle}>{plan.title}</Text>
                <View className={styles.planMeta}>
                  <View className={styles.planMetaTag}>⏱ {plan.duration}</View>
                  <View className={styles.planMetaTag} style={{ background: iTag.bg, color: iTag.color }}>
                    {iTag.text}
                  </View>
                  {plan.targetParts.length > 0 && (
                    <View className={styles.planMetaTag}>
                      🎯 {plan.targetParts.slice(0, 3).map(p => BODY_PART_NAMES[p]).join('/')}
                    </View>
                  )}
                </View>
              </View>
            </View>

            <Text className={styles.planDesc}>{plan.description}</Text>

            <View className={styles.planSteps}>
              {plan.items.map((item, i) => (
                <View key={i} className={styles.planStep}>
                  <View className={styles.stepNum}>{i + 1}</View>
                  <Text style={{ flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>

            <View className={styles.planBtnRow}>
              <Button
                className={classnames(styles.planBtn, styles.secondary)}
                onClick={() => Taro.showToast({ title: `适合${plan.suitableRiskLevels.map(l => getRiskLevelText(l)).join('/')}风险`, icon: 'none' })}
              >
                查看适合人群
              </Button>
              <Button
                className={classnames(styles.planBtn, styles.primary)}
                onClick={() => addPlanToSchedule(plan.id)}
              >
                加入日程
              </Button>
            </View>
          </View>
        );
      })}

      <View className={styles.reminderSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🔔 训练日程提醒</Text>
          <View
            className={styles.addBtn}
            onClick={() => Taro.showToast({ title: '请先选择上方方案', icon: 'none' })}
          >
            + 新建
          </View>
        </View>

        {remindersSorted.length > 0 ? remindersSorted.map(r => (
          <View
            key={r.id}
            className={classnames(styles.reminderCard, { [styles.done]: r.done })}
          >
            <View
              className={styles.reminderCheck}
              onClick={() => handleToggleReminder(r.id)}
            >
              {r.done ? '✓' : ''}
            </View>
            <View className={styles.reminderContent}>
              <View className={styles.reminderDate}>
                <Text>📅 {formatDateLabel(r.date)}</Text>
                <Text style={{ color: '#CBD5E1' }}>·</Text>
                <View className={classnames(styles.typeTag, styles[r.type])}>
                  {TYPE_NAMES[r.type]}
                </View>
                {r.planType && r.planType !== r.type && (
                  <View className={styles.planTypeTag}>{PLAN_TYPE_NAMES[r.planType]}</View>
                )}
                {r.completedAt && (
                  <View style={{ padding: '4rpx 12rpx', borderRadius: 4, fontSize: 20, background: '#ECFDF5', color: '#059669' }}>
                    已完成
                  </View>
                )}
              </View>
              <Text className={styles.reminderTitle}>{r.title}</Text>
              <Text className={styles.reminderDesc}>{r.description}</Text>
              <View className={styles.reminderActions}>
                <Button
                  className={styles.reminderActionBtn}
                  onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleChangeDate(r.id, r.date, r.title); }}
                >
                  📅 调整日期
                </Button>
                <Button
                  className={classnames(styles.reminderActionBtn, styles.danger)}
                  onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleDelete(r.id); }}
                >
                  🗑 删除
                </Button>
              </View>
            </View>
          </View>
        )) : (
          <View className={styles.emptyState}>
            📭 暂无日程提醒{'\n'}
            从上方方案中选择并加入日程吧
          </View>
        )}
      </View>

      <View className={styles.emergencyCard}>
        <Text className={styles.emergencyTitle}>🚨 紧急就医判断标准</Text>
        {EMERGENCY_RULES.shouldSeekMedical.map((item, i) => (
          <View key={i} className={styles.emergencyItem}>
            <Text className={styles.emergencyDot}>•</Text>
            <Text style={{ flex: 1 }}>{item}</Text>
          </View>
        ))}
        <Button className={styles.callBtn} onClick={handleEmergency}>
          📞 紧急呼叫 120
        </Button>
      </View>
    </ScrollView>
  );
};

export default TrainingPage;
