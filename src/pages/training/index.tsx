import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView, Input, Slider } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { TRAINING_PLANS, EMERGENCY_RULES } from '@/data/training';
import { useAppStore } from '@/store/app';
import { getRiskLevelText, BODY_PART_NAMES } from '@/utils/risk';
import { PlanType, ReminderType, DayScheduleItem, TrainingRecord, SportType } from '@/types';

type PlanTab = PlanType;
type ViewMode = 'list' | 'calendar';
type ModalType = 'training' | 'editTraining' | null;

const SPORT_OPTIONS: { key: SportType; name: string; icon: string }[] = [
  { key: 'running', name: '跑步', icon: '🏃' },
  { key: 'ball', name: '球类', icon: '⚽' },
  { key: 'fitness', name: '健身', icon: '💪' }
];

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

const REMINDER_TYPES_OPTIONS: { key: ReminderType; name: string; icon: string }[] = [
  { key: 'rest', name: '休息', icon: '😴' },
  { key: 'alternative', name: '替代训练', icon: '🔄' },
  { key: 'recovery', name: '康复训练', icon: '💪' },
  { key: 'training', name: '常规训练', icon: '🏃' },
  { key: 'check', name: '检查评估', icon: '📋' }
];

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

const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];
const FULL_WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const addDaysKey = (key: string, n: number) => {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const TrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlanTab>('rest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(today);

  // 训练编辑弹窗
  const [modal, setModal] = useState<ModalType>(null);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [editPatch, setEditPatch] = useState<Partial<TrainingRecord> & { dateKey?: string }>({});
  const [newTraining, setNewTraining] = useState({
    sportType: 'running' as SportType,
    duration: 45,
    intensity: 3,
    sets: 0,
    note: '',
    completed: true,
    dateKey: today
  });

  const quickDates = useMemo(() => {
    const result: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = -6; i <= 0; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const label = i === 0 ? '今天' : i === -1 ? '昨天' : `${d.getMonth() + 1}/${d.getDate()}`;
      result.push({ key, label });
    }
    return result;
  }, []);

  const {
    reminders,
    trainingRecords,
    toggleReminder,
    updateReminderDate,
    deleteReminder,
    addReminder,
    addPlanWithSchedule,
    moveReminderSchedule,
    getSmartRecommendations,
    getLatestRiskLevel,
    getLatestPainfulParts,
    getRecoveryStatusSummary,
    getWeeklySchedule,
    getDaySchedule,
    getWeekRange,
    cancelPlanSchedule,
    refreshPlanSchedulesByState,
    addTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    getNextWeekRecommendation,
    applyNextWeekRecommendation
  } = useAppStore();

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weekSchedule: DayScheduleItem[] = useMemo(
    () => getWeeklySchedule(weekOffset),
    [weekOffset, reminders.length, trainingRecords.length]
  );
  const selectedDay: DayScheduleItem | null = useMemo(
    () => (selectedDateKey ? getDaySchedule(selectedDateKey) : null),
    [selectedDateKey, reminders.length, trainingRecords.length]
  );

  const smartRecs = useMemo(() => getSmartRecommendations(), [
    reminders.length,
    trainingRecords.length,
    getLatestRiskLevel(),
    getLatestPainfulParts().length,
    getRecoveryStatusSummary()
  ]);

  const nextWeekRec = useMemo(() => getNextWeekRecommendation(), [
    reminders.length,
    trainingRecords.length,
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

  const getIntensityLabel = (level: number) => {
    const labels = ['', '很轻松', '轻松', '中等', '较强', '高强度'];
    return labels[level] || '中等';
  };

  const getIntensityColor = (level: number) => {
    if (level <= 2) return { color: '#10B981', bg: '#ECFDF5' };
    if (level <= 3) return { color: '#3B82F6', bg: '#DBEAFE' };
    if (level <= 4) return { color: '#F59E0B', bg: '#FEF3C7' };
    return { color: '#EF4444', bg: '#FEE2E2' };
  };

  const addPlanToSchedule = (planId: string) => {
    const plan = TRAINING_PLANS.find(p => p.id === planId);
    if (!plan) return;

    const days = plan.defaultDurationDays || 1;
    Taro.showModal({
      title: '加入训练日程',
      content: plan.scheduleNote
        ? `${plan.scheduleNote}\n\n将为您从明天开始生成连续${days}天的安排，第${days}天自动生成一次「检查评估」。`
        : `将「${plan.title}」拆成${days}天连续训练，明天开始执行。可以在周历中调整日期。`,
      confirmText: '确认添加',
      confirmColor: '#F97316',
      success: (res) => {
        if (res.confirm) {
          const tomorrow = addDaysKey(today, 1);
          const result = addPlanWithSchedule(planId, tomorrow);
          Taro.showToast({
            title: `已生成${result.days}天安排`,
            icon: 'success'
          });
          Taro.vibrateShort({ type: 'medium' });
          setTimeout(() => {
            const info = refreshPlanSchedulesByState();
            if (info.removed > 0) {
              Taro.showToast({
                title: `已清理${info.removed}条过时提醒`,
                icon: 'none',
                duration: 1500
              });
            }
          }, 300);
        }
      }
    });
  };

  const handleAddReminderToDate = (dateKey: string) => {
    const options = REMINDER_TYPES_OPTIONS.map(o => `${o.icon} ${o.name}`);
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        const type = REMINDER_TYPES_OPTIONS[res.tapIndex].key;
        Taro.showModal({
          title: `${TYPE_NAMES[type]} - ${dateKey}`,
          editable: true,
          placeholderText: '请输入安排标题（如：跑步 5 公里）',
          confirmText: '添加',
          success: (mRes) => {
            if (mRes.confirm && mRes.content && mRes.content.trim()) {
              addReminder({
                date: dateKey,
                title: mRes.content.trim(),
                description: `由训练计划手动添加 · ${formatDateLabel(dateKey)}`,
                type,
                planType: type === 'rest' ? 'rest' : type === 'alternative' ? 'alternative' : 'recovery'
              });
              Taro.showToast({ title: '已添加', icon: 'success' });
            }
          }
        });
      }
    });
  };

  const handleToggleReminder = (id: string) => {
    toggleReminder(id);
    Taro.vibrateShort({ type: 'light' });
  };

  const handleMoveReminder = (id: string, offset: number) => {
    const result = moveReminderSchedule(id, offset);
    if (result) {
      Taro.showToast({
        title: offset > 0 ? `已延后${offset}天到${result.newDate.slice(5)}` : `已提前${-offset}天到${result.newDate.slice(5)}`,
        icon: 'none'
      });
    } else {
      Taro.showToast({ title: '调整失败', icon: 'none' });
    }
  };

  const handleChangeDate = (id: string, currentDate: string) => {
    const todayTs = new Date(today).getTime();
    const dates: { key: string; label: string }[] = [];
    for (let i = -3; i <= 10; i++) {
      const ts = todayTs + i * 86400000;
      const d = new Date(ts).toISOString().split('T')[0];
      dates.push({ key: d, label: formatDateLabel(d) + ` (${d.slice(5)})` });
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

  const handleDelete = (id: string, title?: string) => {
    Taro.showModal({
      title: '删除提醒',
      content: title ? `确认删除「${title}」？` : '确认删除这条日程提醒？删除后无法恢复。',
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

  const handleDayQuickAdd = (dateKey: string) => {
    Taro.showActionSheet({
      itemList: ['📅 新增日程提醒', '🏃 新增训练记录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          handleAddReminderToDate(dateKey);
        } else if (res.tapIndex === 1) {
          handleAddTrainingToDate(dateKey);
        }
      }
    });
  };

  const handleAddTrainingToDate = (dateKey: string) => {
    setNewTraining({
      ...newTraining,
      dateKey
    });
    setModal('training');
  };

  const handleEditTraining = (record: TrainingRecord) => {
    setEditingRecord(record);
    setEditPatch({});
    setModal('editTraining');
  };

  const saveEditTraining = () => {
    if (!editingRecord) return;
    const patch: Partial<TrainingRecord> & { dateKey?: string } = {};
    if (editPatch.sportType !== undefined) patch.sportType = editPatch.sportType;
    if (editPatch.duration !== undefined) patch.duration = editPatch.duration;
    if (editPatch.intensity !== undefined) patch.intensity = editPatch.intensity;
    if (editPatch.sets !== undefined) patch.sets = editPatch.sets;
    if (editPatch.note !== undefined) patch.note = editPatch.note;
    if (editPatch.completed !== undefined) patch.completed = editPatch.completed;
    if (editPatch.dateKey !== undefined) patch.dateKey = editPatch.dateKey;

    if (Object.keys(patch).length > 0) {
      updateTrainingRecord(editingRecord.id, patch);
      Taro.showToast({ title: '已更新', icon: 'success' });
      Taro.vibrateShort({ type: 'medium' });
    }
    setModal(null);
    setEditingRecord(null);
    setEditPatch({});
  };

  const saveNewTraining = () => {
    addTrainingRecord({
      sportType: newTraining.sportType,
      duration: newTraining.duration,
      intensity: newTraining.intensity,
      sets: newTraining.sets,
      note: newTraining.note,
      completed: newTraining.completed,
      dateKey: newTraining.dateKey
    });
    Taro.showToast({ title: '已记录', icon: 'success' });
    Taro.vibrateShort({ type: 'medium' });
    setModal(null);
    setNewTraining({
      sportType: 'running',
      duration: 45,
      intensity: 3,
      sets: 0,
      note: '',
      completed: true,
      dateKey: today
    });
  };

  const handleChangeTrainingDate = (id: string, currentDate: string) => {
    const todayTs = new Date(today).getTime();
    const dates: { key: string; label: string }[] = [];
    for (let i = -7; i <= 10; i++) {
      const ts = todayTs + i * 86400000;
      const d = new Date(ts).toISOString().split('T')[0];
      dates.push({ key: d, label: formatDateLabel(d) + ` (${d.slice(5)})` });
    }

    Taro.showActionSheet({
      itemList: dates.map(d => d.label),
      success: (res) => {
        const newDate = dates[res.tapIndex].key;
        updateTrainingRecord(id, { dateKey: newDate });
        Taro.showToast({ title: `已调整到${formatDateLabel(newDate)}`, icon: 'success' });
      }
    });
  };

  const handleDeleteTraining = (id: string, title: string) => {
    Taro.showModal({
      title: '删除训练记录',
      content: `确认删除这条${title}记录？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          deleteTrainingRecord(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const handleCancelPlan = (scheduleGroupId: string, title: string) => {
    Taro.showModal({
      title: '取消本组方案日程',
      content: `将删除「${title}」本组方案中所有未完成提醒，不影响其他同类型方案安排。确认？`,
      confirmText: '确认取消',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          const n = cancelPlanSchedule(scheduleGroupId);
          Taro.showToast({ title: `已移除${n}条安排`, icon: 'success' });
        }
      }
    });
  };

  const handleApplyNextWeek = () => {
    if (!nextWeekRec) return;
    Taro.showModal({
      title: `生成下周安排 - ${nextWeekRec.strategyName}`,
      content: `${nextWeekRec.scheduleNote}\n\n将为您自动安排下周一到周日的训练计划，确认后立即生成。`,
      confirmText: '一键生成',
      confirmColor: '#10B981',
      success: (res) => {
        if (res.confirm) {
          const result = applyNextWeekRecommendation();
          if (result) {
            Taro.showToast({
              title: `已生成${result.planCount}个方案共${result.days}天`,
              icon: 'success',
              duration: 2000
            });
            Taro.vibrateShort({ type: 'medium' });
            setWeekOffset(1);
            setTimeout(() => {
              const info = refreshPlanSchedulesByState();
              if (info.adjustments.length > 0) {
                Taro.showToast({
                  title: `智能调整了${info.adjustments.length}处`,
                  icon: 'none',
                  duration: 1500
                });
              }
            }, 500);
          } else {
            Taro.showToast({ title: '生成失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleEmergency = () => {
    Taro.makePhoneCall({ phoneNumber: '120' }).catch(() => {
      Taro.showToast({ title: '拨号取消', icon: 'none' });
    });
  };

  const remindersSorted = useMemo(() =>
    [...reminders]
      .filter(r => {
        const rDate = new Date(r.date).getTime();
        const tDate = new Date(today).getTime();
        return rDate >= tDate - 86400000 * 3;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.date.localeCompare(b.date);
      }),
    [reminders]
  );

  const reminderTypeDots = (reminders: any[]) => {
    const counts: Record<string, number> = {};
    reminders.forEach(r => { if (!r.done) counts[r.type] = (counts[r.type] || 0) + 1; });
    const types: ReminderType[] = ['rest', 'alternative', 'recovery', 'training', 'check'];
    return types.filter(t => counts[t]).map(t => ({ type: t, count: counts[t] }));
  };

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
          基于最新风险评估、疼痛部位和恢复状态综合计算，推荐优先级最高的训练方案。加入日程时将自动拆分为连续多天的安排。
        </Text>

        {smartRecs.length > 0 ? smartRecs.map((rec, idx) => {
          const plan = TRAINING_PLANS.find(p => p.id === rec.planId);
          if (!plan) return null;
          const duration = rec.recommendedDurationDays || plan.defaultDurationDays || 1;
          return (
            <View key={rec.planId} className={styles.recCard}>
              <View className={styles.recTop}>
                <Text className={styles.recName}>
                  {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '}{plan.title}
                </Text>
                <View className={styles.recPriority}>匹配度 {rec.matchPercentage ? rec.matchPercentage : Math.min(rec.priority, 100)}%</View>
              </View>
              <Text className={styles.recReason}>{rec.reason}</Text>
              {rec.detailedReasons && rec.detailedReasons.length > 0 && (
                <View className={styles.recCardBottom}>
                  {rec.detailedReasons.slice(0, 4).map((r, i) => (
                    <View key={i} className={styles.recReasonChip}>{r}</View>
                  ))}
                  <View className={styles.recDays}>⏱ 持续 {duration} 天</View>
                </View>
              )}
              {rec.scheduleHint && (
                <View className={styles.recScheduleHint}>💡 {rec.scheduleHint}</View>
              )}
              <Button
                className={styles.recAddBtn}
                onClick={() => addPlanToSchedule(plan.id)}
              >
                + 一键加入日程 · 自动拆成{duration}天
              </Button>
            </View>
          );
        }) : (
          <View style={{ padding: 24, textAlign: 'center', color: '#92400E', fontSize: 26, background: '#fff', borderRadius: 12 }}>
            暂无足够数据生成推荐，请先完成风险自测或记录疼痛情况
          </View>
        )}
      </View>

      <View className={styles.viewTabs}>
        <View
          className={classnames(styles.viewTab, { [styles.active]: viewMode === 'list' })}
          onClick={() => { setViewMode('list'); Taro.vibrateShort({ type: 'light' }); }}
        >
          📋 列表视图
        </View>
        <View
          className={classnames(styles.viewTab, { [styles.active]: viewMode === 'calendar' })}
          onClick={() => { setViewMode('calendar'); Taro.vibrateShort({ type: 'light' }); }}
        >
          📅 周历视图
        </View>
      </View>

      {viewMode === 'list' && (
        <>
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
                    <View className={styles.planDurationRow}>
                      ⏱ 建议持续 <strong>{plan.defaultDurationDays || 1}</strong> 天
                      {plan.targetParts.length > 0 && (
                        <>  ·  🎯 {plan.targetParts.slice(0, 3).map(p => BODY_PART_NAMES[p]).join('/')}</>
                      )}
                    </View>
                    <View className={styles.planMeta}>
                      <View className={styles.planMetaTag}>⏱ {plan.duration}/次</View>
                      <View className={styles.planMetaTag} style={{ background: iTag.bg, color: iTag.color }}>
                        {iTag.text}
                      </View>
                    </View>
                  </View>
                </View>

                <Text className={styles.planDesc}>{plan.description}</Text>
                {plan.scheduleNote && (
                  <View className={styles.recScheduleHint}>📌 {plan.scheduleNote}</View>
                )}

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
                    加入日程（{plan.defaultDurationDays || 1}天）
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
                onClick={() => handleAddReminderToDate(today)}
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
                    {r.scheduleTotalDays && (
                      <View style={{ padding: '4rpx 12rpx', borderRadius: 4, fontSize: 20, background: '#F0FDF4', color: '#047857', fontWeight: 500 }}>
                        D{(r.scheduleDayIndex || 0) + 1}/{r.scheduleTotalDays}
                      </View>
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
                      onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleMoveReminder(r.id, -1); }}
                    >
                      ⏮ 提前1天
                    </Button>
                    <Button
                      className={styles.reminderActionBtn}
                      onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleMoveReminder(r.id, 1); }}
                    >
                      延后1天 ⏭
                    </Button>
                    <Button
                      className={styles.reminderActionBtn}
                      onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleChangeDate(r.id, r.date); }}
                    >
                      📅 改日期
                    </Button>
                    {r.scheduleGroupId && !r.done && (
                      <Button
                        className={styles.reminderActionBtn}
                        onClick={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          const plan = TRAINING_PLANS.find(p => p.id === r.originPlanId);
                          handleCancelPlan(r.scheduleGroupId!, plan ? plan.title : r.title);
                        }}
                      >
                        ⛔ 取消本组
                      </Button>
                    )}
                    <Button
                      className={classnames(styles.reminderActionBtn, styles.danger)}
                      onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleDelete(r.id, r.title); }}
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
        </>
      )}

      {viewMode === 'calendar' && (
        <>
          {nextWeekRec && (
            <View className={classnames(styles.nextWeekCard, styles[nextWeekRec.strategy])}>
              <View className={styles.nwHeader}>
                <View className={styles.nwIcon}>
                  {nextWeekRec.strategy === 'rest' && '😴'}
                  {nextWeekRec.strategy === 'taper' && '📉'}
                  {nextWeekRec.strategy === 'maintain' && '⚖️'}
                  {nextWeekRec.strategy === 'recovery' && '💪'}
                  {nextWeekRec.strategy === 'advance' && '🚀'}
                </View>
                <View style={{ flex: 1 }}>
                  <View className={styles.nwTitle}>
                    下周建议：{nextWeekRec.strategyName}
                  </View>
                  <View className={styles.nwReason}>
                    {nextWeekRec.reason}
                  </View>
                </View>
              </View>

              <View className={styles.nwMetrics}>
                <View className={styles.nwMetric}>
                  <Text className={styles.nwMetricNum}>{nextWeekRec.keyMetrics.completionRate}%</Text>
                  <Text className={styles.nwMetricLbl}>本周完成率</Text>
                </View>
                <View className={styles.nwMetric}>
                  <Text className={styles.nwMetricNum} style={{ color: nextWeekRec.keyMetrics.painDelta > 0 ? '#EF4444' : '#10B981' }}>
                    {nextWeekRec.keyMetrics.painDelta > 0 ? '+' : ''}{nextWeekRec.keyMetrics.painDelta}
                  </Text>
                  <Text className={styles.nwMetricLbl}>疼痛变化</Text>
                </View>
                <View className={styles.nwMetric}>
                  <Text className={styles.nwMetricNum} style={{ color: nextWeekRec.keyMetrics.trainingLoadDelta > 0 ? '#3B82F6' : '#94A3B8' }}>
                    {nextWeekRec.keyMetrics.trainingLoadDelta > 0 ? '+' : ''}{nextWeekRec.keyMetrics.trainingLoadDelta}分
                  </Text>
                  <Text className={styles.nwMetricLbl}>负荷变化</Text>
                </View>
                <View className={styles.nwMetric}>
                  <Text className={styles.nwMetricNum}>{nextWeekRec.predictedDurationDays}天</Text>
                  <Text className={styles.nwMetricLbl}>建议安排</Text>
                </View>
              </View>

              <View className={styles.nwNote}>
                💡 {nextWeekRec.scheduleNote}
              </View>

              <View className={styles.nwAction} onClick={handleApplyNextWeek}>
                一键生成下周安排 →
              </View>
            </View>
          )}

          <View className={styles.legendRow}>
            {[
              { k: 'rest', n: '休息' },
              { k: 'alternative', n: '替代训练' },
              { k: 'recovery', n: '康复' },
              { k: 'training', n: '常规训练' },
              { k: 'check', n: '检查' },
              { k: 'pain', n: '疼痛记录' },
              { k: 'risk', n: '风险自测' }
            ].map(l => (
              <View key={l.k} className={styles.legend}>
                <View className={classnames(styles.legendBar, styles[l.k])} />
                <Text>{l.n}</Text>
              </View>
            ))}
          </View>

          <View className={styles.weekNav}>
            <View
              className={styles.weekNavBtn}
              onClick={() => { setWeekOffset(weekOffset - 1); Taro.vibrateShort({ type: 'light' }); }}
            >
              ‹
            </View>
            <View className={styles.weekNavLabel}>
              {weekOffset === 0 ? '本周' : weekOffset === -1 ? '上周' : weekOffset === 1 ? '下周' : `${weekOffset > 0 ? '下' : '上'}${Math.abs(weekOffset)}周`}
              <Text className={styles.sub}>{weekRange.startKey.slice(5)} ~ {weekRange.endKey.slice(5)}</Text>
            </View>
            <View
              className={styles.weekNavBtn}
              onClick={() => { setWeekOffset(weekOffset + 1); Taro.vibrateShort({ type: 'light' }); }}
            >
              ›
            </View>
          </View>

          <View className={styles.calendarGrid}>
            <View className={styles.calWeekHeader}>
              {WEEKDAY_NAMES.map((w, i) => (
                <View
                  key={i}
                  className={classnames(styles.calWeekTitle, {
                    [styles.sun]: i === 6,
                    [styles.sat]: i === 5
                  })}
                >
                  周{w}
                </View>
              ))}
            </View>
            <View className={styles.calBody}>
              {weekSchedule.map((day, i) => {
                const dots = reminderTypeDots(day.reminders);
                return (
                  <View
                    key={day.dateKey + '_' + i}
                    className={classnames(styles.calDay, {
                      [styles.selected]: selectedDateKey === day.dateKey,
                      [styles.today]: day.isToday,
                      [styles.hasActivity]: day.hasActivity
                    })}
                    onClick={() => { setSelectedDateKey(day.dateKey); Taro.vibrateShort({ type: 'light' }); }}
                  >
                    <Text className={classnames(styles.calDayDate)}>
                      {parseInt(day.dateKey.split('-')[2], 10)}
                    </Text>
                    <View className={styles.calDayDots}>
                      {dots.slice(0, 3).map((d, di) => (
                        <View key={di} className={classnames(styles.calDot, styles[d.type])} />
                      ))}
                      {day.painCount > 0 && <View className={classnames(styles.calDot, styles.pain)} />}
                      {day.riskLevel && day.riskLevel !== 'low' && <View className={classnames(styles.calDot, styles.risk)} />}
                    </View>
                    {day.reminders.length > 0 && (
                      <Text className={styles.calDayCount}>{day.reminders.filter(r => !r.done).length}待办</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {selectedDay && (
            <View className={styles.daySchedule}>
              <View className={styles.dayHeader}>
                <View className={styles.dayTitle}>
                  <Text className={styles.dot}>●</Text>
                  {selectedDay.dateDisplay} {FULL_WEEKDAY_NAMES[(new Date(selectedDay.dateKey + 'T00:00:00').getDay() + 6) % 7]}
                  {selectedDay.isToday && <View className={styles.today}>今天</View>}
                </View>
                <View
                  className={styles.dayQuickAdd}
                  onClick={() => handleDayQuickAdd(selectedDay.dateKey)}
                >
                  + 新增
                </View>
              </View>

              <View className={styles.daySubInfo}>
                {selectedDay.riskLevel && selectedDay.riskLevel !== 'low' && (
                  <View className={classnames(styles.dayBadge, styles.risk)}>
                    🎯 {getRiskLevelText(selectedDay.riskLevel)}风险
                  </View>
                )}
                {selectedDay.painCount > 0 && (
                  <View className={classnames(styles.dayBadge, styles.pain)}>
                    📍 {selectedDay.painCount}条疼痛记录
                  </View>
                )}
                {selectedDay.reminders.length > 0 && (
                  <>
                    <View className={classnames(styles.dayBadge, styles.total)}>
                      📌 共 {selectedDay.reminders.length} 条
                    </View>
                    <View className={classnames(styles.dayBadge, styles.done)}>
                      ✅ 已完成 {selectedDay.reminders.filter(r => r.done).length}
                    </View>
                  </>
                )}
              </View>

              {selectedDay.trainingRecords.length > 0 && (
                <View className={styles.dayTrainingSummary}>
                  <View className={styles.dtsItem}>
                    <Text className={styles.dtsNum}>
                      {selectedDay.trainingRecords.reduce((s, t) => s + t.duration, 0)}
                    </Text>
                    <Text className={styles.dtsLbl}>总时长(分钟)</Text>
                  </View>
                  <View className={styles.dtsItem}>
                    <Text className={styles.dtsNum}>{selectedDay.trainingRecords.length}</Text>
                    <Text className={styles.dtsLbl}>训练次数</Text>
                  </View>
                  <View className={styles.dtsItem}>
                    <Text className={styles.dtsNum}>
                      {selectedDay.trainingRecords.reduce((s, t) => s + (t.sets || 0), 0)}
                    </Text>
                    <Text className={styles.dtsLbl}>总组数</Text>
                  </View>
                  <View className={styles.dtsItem}>
                    <Text className={styles.dtsNum}>
                      {selectedDay.trainingRecords.length > 0
                        ? (selectedDay.trainingRecords.reduce((s, t) => s + t.intensity, 0) / selectedDay.trainingRecords.length).toFixed(1)
                        : '-'}
                    </Text>
                    <Text className={styles.dtsLbl}>平均强度</Text>
                  </View>
                </View>
              )}

              {selectedDay.reminders.length === 0 && selectedDay.trainingRecords.length === 0 ? (
                <View className={styles.dayScheduleEmpty}>
                  <Text className={styles.icon}>📭</Text>
                  这一天还没有任何安排{'\n'}
                  点击右上角「新增安排」快速添加，或切到列表视图选择智能方案
                </View>
              ) : (
                <>
                  {selectedDay.reminders.length > 0 && (
                    <View className={styles.schedSectionTitle}>日程提醒 ({selectedDay.reminders.length})</View>
                  )}
                  {selectedDay.reminders.map(r => (
                    <View
                      key={r.id}
                      className={classnames(styles.schedReminder, styles[r.type], { [styles.done]: r.done })}
                    >
                      <View
                        className={styles.schedTick}
                        onClick={() => handleToggleReminder(r.id)}
                      >
                        {r.done ? '✓' : ''}
                      </View>
                      <View className={styles.schedInfo}>
                        <View>
                          <View className={classnames(styles.tag, styles[r.type])}>{TYPE_NAMES[r.type]}</View>
                          {r.scheduleTotalDays && (
                            <View className={styles.tag} style={{ background: '#F0FDF4', color: '#047857' }}>
                              D{(r.scheduleDayIndex || 0) + 1}/{r.scheduleTotalDays}
                            </View>
                          )}
                        </View>
                        <View className={styles.title}>{r.title}</View>
                        <View className={styles.desc}>{r.description}</View>
                      </View>
                      <View className={styles.schedActions}>
                        <View style={{ display: 'flex', gap: 4 }}>
                          <View
                            className={styles.shiftBtn}
                            onClick={() => handleMoveReminder(r.id, -1)}
                          >
                            ← 前移
                          </View>
                          <View
                            className={styles.shiftBtn}
                            onClick={() => handleMoveReminder(r.id, 1)}
                          >
                            后移 →
                          </View>
                        </View>
                        <View style={{ display: 'flex', gap: 4 }}>
                          <View
                            className={styles.shiftBtn}
                            onClick={() => handleChangeDate(r.id, r.date)}
                          >
                            📅 改日期
                          </View>
                          <View
                            className={styles.delBtn}
                            onClick={() => handleDelete(r.id, r.title)}
                          >
                            删除
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}

                  {selectedDay.trainingRecords.length > 0 && (
                    <>
                      <View className={styles.schedSectionTitle}>训练记录 ({selectedDay.trainingRecords.length})</View>
                      {selectedDay.trainingRecords.map((t, ti) => (
                        <View
                          key={t.id || ti}
                          className={classnames(styles.schedReminder, styles.training)}
                        >
                          <View className={styles.schedTick} style={{ background: '#3B82F6', borderColor: '#3B82F6' }}>
                            {t.sportType === 'running' ? '🏃' : t.sportType === 'ball' ? '⚽' : '💪'}
                          </View>
                          <View className={styles.schedInfo}>
                            <View>
                              <View className={styles.tag} style={{ background: '#DBEAFE', color: '#2563EB' }}>
                                {({ running: '跑步', ball: '球类', fitness: '健身' } as any)[t.sportType] || '训练'}
                              </View>
                              <View className={styles.tag} style={{ background: getIntensityColor(t.intensity).bg, color: getIntensityColor(t.intensity).color }}>
                                {getIntensityLabel(t.intensity)}强度
                              </View>
                            </View>
                            <View className={styles.title}>
                              {t.duration} 分钟
                              {t.sets ? ` · ${t.sets}组` : ''}
                            </View>
                            {t.note && <View className={styles.desc}>{t.note}</View>}
                          </View>
                          <View className={styles.schedActions}>
                            <View style={{ display: 'flex', gap: 4 }}>
                              <View
                                className={styles.shiftBtn}
                                onClick={() => handleEditTraining(t)}
                              >
                                ✏️ 编辑
                              </View>
                              <View
                                className={styles.shiftBtn}
                                onClick={() => handleChangeTrainingDate(t.id, t.date)}
                              >
                                📅 改日期
                              </View>
                            </View>
                            <View style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                              <View
                                className={styles.delBtn}
                                onClick={() => handleDeleteTraining(t.id, `${t.sportType}训练`)}
                              >
                                删除
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </>
      )}

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

      {/* 训练编辑弹窗 */}
      {(modal === 'training' || modal === 'editTraining') && (
        <View className={styles.modalMask} onClick={() => setModal(null)}>
          <View className={styles.modalContent} onClick={e => e.stopPropagation && e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>
                {modal === 'editTraining' ? '编辑训练记录' : '新增训练记录'}
              </Text>
              <View className={styles.modalClose} onClick={() => setModal(null)}>×</View>
            </View>

            {/* 日期选择 */}
            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>选择日期</Text>
              <View className={styles.datePickerRow}>
                {quickDates.map(d => (
                  <View key={d.key}
                    className={classnames(styles.dateQuickTag, {
                      [styles.selected]: (modal === 'editTraining'
                        ? (editPatch.dateKey ?? editingRecord?.date)
                        : newTraining.dateKey) === d.key
                    })}
                    onClick={() => {
                      if (modal === 'editTraining') {
                        setEditPatch({ ...editPatch, dateKey: d.key });
                      } else {
                        setNewTraining({ ...newTraining, dateKey: d.key });
                      }
                      Taro.vibrateShort({ type: 'light' });
                    }}
                  >
                    {d.label}
                  </View>
                ))}
              </View>
            </View>

            {/* 类型 */}
            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>运动类型</Text>
              <View className={styles.optionGroup}>
                {SPORT_OPTIONS.map(o => {
                  const val = modal === 'editTraining'
                    ? (editPatch.sportType ?? editingRecord?.sportType)
                    : newTraining.sportType;
                  return (
                    <View key={o.key}
                      className={classnames(styles.optionItem, { [styles.selected]: val === o.key })}
                      onClick={() => {
                        if (modal === 'editTraining') {
                          setEditPatch({ ...editPatch, sportType: o.key });
                        } else {
                          setNewTraining({ ...newTraining, sportType: o.key });
                        }
                      }}
                    >{o.icon} {o.name}</View>
                  );
                })}
              </View>
            </View>

            {/* 时长 */}
            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>训练时长</Text>
                <Text className={styles.sliderValue}>
                  {modal === 'editTraining'
                    ? (editPatch.duration ?? editingRecord?.duration ?? 45)
                    : newTraining.duration} 分钟
                  <Text style={{ fontSize: 22, fontWeight: 400, color: '#64748B' }}>
                    （约{Math.round(((modal === 'editTraining'
                      ? (editPatch.duration ?? editingRecord?.duration ?? 45)
                      : newTraining.duration) / 60) * 10) / 10} 小时）
                  </Text>
                </Text>
              </View>
              <Slider min={10} max={180} step={5}
                value={modal === 'editTraining'
                  ? (editPatch.duration ?? editingRecord?.duration ?? 45)
                  : newTraining.duration}
                activeColor="#3B82F6" blockColor="#3B82F6" blockSize={28}
                onChange={e => {
                  if (modal === 'editTraining') {
                    setEditPatch({ ...editPatch, duration: e.detail.value });
                  } else {
                    setNewTraining({ ...newTraining, duration: e.detail.value });
                  }
                }} />
            </View>

            {/* 强度 */}
            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>训练强度</Text>
                <Text className={styles.sliderValue}>
                  {(modal === 'editTraining'
                    ? (editPatch.intensity ?? editingRecord?.intensity ?? 3)
                    : newTraining.intensity)}/5
                  <Text style={{ fontSize: 22, fontWeight: 400, color: '#64748B' }}>
                    （{['', '轻松', '较低', '中等', '较高', '极限'][modal === 'editTraining'
                      ? (editPatch.intensity ?? editingRecord?.intensity ?? 3)
                      : newTraining.intensity]}）
                  </Text>
                </Text>
              </View>
              <Slider min={1} max={5} step={1}
                value={modal === 'editTraining'
                  ? (editPatch.intensity ?? editingRecord?.intensity ?? 3)
                  : newTraining.intensity}
                activeColor={[0, '', '#10B981', '#10B981', '#F59E0B', '#EF4444'][modal === 'editTraining'
                  ? (editPatch.intensity ?? editingRecord?.intensity ?? 3)
                  : newTraining.intensity]}
                blockColor={[0, '', '#10B981', '#10B981', '#F59E0B', '#EF4444'][modal === 'editTraining'
                  ? (editPatch.intensity ?? editingRecord?.intensity ?? 3)
                  : newTraining.intensity]}
                blockSize={28}
                onChange={e => {
                  if (modal === 'editTraining') {
                    setEditPatch({ ...editPatch, intensity: e.detail.value });
                  } else {
                    setNewTraining({ ...newTraining, intensity: e.detail.value });
                  }
                }} />
            </View>

            {/* 组数 */}
            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>训练组数（可选）</Text>
                <Text className={styles.sliderValue}>
                  {modal === 'editTraining'
                    ? (editPatch.sets ?? editingRecord?.sets ?? 0)
                    : newTraining.sets} 组
                </Text>
              </View>
              <Slider min={0} max={20} step={1}
                value={modal === 'editTraining'
                  ? (editPatch.sets ?? editingRecord?.sets ?? 0)
                  : newTraining.sets}
                activeColor="#8B5CF6" blockColor="#8B5CF6" blockSize={24}
                onChange={e => {
                  if (modal === 'editTraining') {
                    setEditPatch({ ...editPatch, sets: e.detail.value });
                  } else {
                    setNewTraining({ ...newTraining, sets: e.detail.value });
                  }
                }} />
            </View>

            {/* 备注 */}
            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>备注（可选）</Text>
              <Input className={styles.formInput}
                value={modal === 'editTraining'
                  ? (editPatch.note ?? editingRecord?.note ?? '')
                  : newTraining.note}
                onInput={e => {
                  if (modal === 'editTraining') {
                    setEditPatch({ ...editPatch, note: e.detail.value });
                  } else {
                    setNewTraining({ ...newTraining, note: e.detail.value });
                  }
                }}
                placeholder="如：5公里配速5:30、肩推30kg等" maxlength={30} />
            </View>

            {/* 状态 */}
            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>状态</Text>
              <View className={styles.optionGroup}>
                {[
                  { k: true, n: '✅ 已完成' },
                  { k: false, n: '⏳ 计划中' }
                ].map(o => {
                  const val = modal === 'editTraining'
                    ? (editPatch.completed ?? editingRecord?.completed ?? true)
                    : newTraining.completed;
                  return (
                    <View key={String(o.k)}
                      className={classnames(styles.optionItem, { [styles.selected]: val === o.k })}
                      onClick={() => {
                        if (modal === 'editTraining') {
                          setEditPatch({ ...editPatch, completed: o.k });
                        } else {
                          setNewTraining({ ...newTraining, completed: o.k });
                        }
                      }}
                    >{o.n}</View>
                  );
                })}
              </View>
            </View>

            <View className={styles.modalBtnRow}>
              <Button className={classnames(styles.modalBtn, styles.secondary)} onClick={() => setModal(null)}>取消</Button>
              <Button className={classnames(styles.modalBtn, styles.primary)}
                onClick={modal === 'editTraining' ? saveEditTraining : saveNewTraining}>
                {modal === 'editTraining' ? '保存修改' : '保存记录'}
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default TrainingPage;
