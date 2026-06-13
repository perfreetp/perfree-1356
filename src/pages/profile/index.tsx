import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView, Input, Slider } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '@/store/app';
import { KNOWLEDGE_CARDS } from '@/data/knowledge';
import { EMERGENCY_RULES } from '@/data/training';
import KnowledgeCard from '@/components/KnowledgeCard';
import { getSportTypeName } from '@/utils/risk';
import { SportType, UserProfile, TrainingRecord, ReminderItem, ReminderType, RiskLevel } from '@/types';

type KnowledgeCat = 'all' | 'prevention' | 'treatment' | 'recovery' | 'emergency';
type TrendMetric = 'risk' | 'pain' | 'recovery' | 'training';
type ModalType = 'profile' | 'training' | 'editTraining' | null;

const CATS: { key: KnowledgeCat; name: string }[] = [
  { key: 'all', name: '全部' },
  { key: 'prevention', name: '预防' },
  { key: 'treatment', name: '治疗' },
  { key: 'recovery', name: '康复' },
  { key: 'emergency', name: '急救' }
];

const SPORT_OPTIONS: { key: SportType; name: string; icon: string }[] = [
  { key: 'running', name: '跑步', icon: '🏃' },
  { key: 'ball', name: '球类', icon: '⚽' },
  { key: 'fitness', name: '健身', icon: '💪' }
];

const TREND_METRICS: { key: TrendMetric; name: string; unit: string }[] = [
  { key: 'risk', name: '风险评分', unit: '分' },
  { key: 'pain', name: '疼痛次数', unit: '次' },
  { key: 'recovery', name: '好转记录', unit: '条' },
  { key: 'training', name: '训练时长', unit: 'h / 分' }
];

const SPORT_FILTER: { key: SportType | 'all'; name: string; icon: string }[] = [
  { key: 'all', name: '全部', icon: '📊' },
  ...SPORT_OPTIONS
];

const RISK_TEXT: Record<RiskLevel, string> = { low: '低风险', medium: '中风险', high: '高风险' };
const RISK_COLOR: Record<RiskLevel, string> = { low: '#10B981', medium: '#F59E0B', high: '#EF4444' };
const REM_TEXT: Record<ReminderType, string> = {
  rest: '休息', alternative: '替代', recovery: '复训', training: '训练', check: '复查'
};
const REM_COLOR: Record<ReminderType, string> = {
  rest: '#06B6D4', alternative: '#8B5CF6', recovery: '#10B981', training: '#3B82F6', check: '#F59E0B'
};

const ProfilePage: React.FC = () => {
  const {
    userProfile, updateProfile,
    getWeeklyTrend, getWeeklyTrainingStats, getRecoveryStatusSummary, getWeekRange,
    getLatestRiskLevel,
    assessments, painRecords, reminders, trainingRecords,
    addTrainingRecord, updateTrainingRecord, toggleTrainingRecord, deleteTrainingRecord,
    toggleReminder
  } = useAppStore();

  const [cat, setCat] = useState<KnowledgeCat>('all');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('training');
  const [modal, setModal] = useState<ModalType>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<SportType | 'all'>('all');

  // --- 个人资料编辑 ---
  const [editProfile, setEditProfile] = useState<UserProfile>(userProfile);
  const openProfileModal = () => { setEditProfile({ ...userProfile }); setModal('profile'); };
  const saveProfile = () => {
    updateProfile(editProfile);
    setModal(null);
    Taro.showToast({ title: '资料已保存', icon: 'success' });
    Taro.vibrateShort({ type: 'medium' });
  };

  // --- 训练记录（新增/补录） ---
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [newTraining, setNewTraining] = useState<{
    sportType: SportType; duration: number; intensity: number; note: string;
    completed: boolean; sets: number; dateKey: string;
  }>({
    sportType: 'running', duration: 45, intensity: 3, note: '',
    completed: true, sets: 0, dateKey: todayKey
  });

  const openNewTraining = (defaultDateKey?: string) => {
    setNewTraining({
      sportType: userProfile.mainSport,
      duration: 45, intensity: 3, note: '', completed: true, sets: 0,
      dateKey: defaultDateKey || todayKey
    });
    setModal('training');
  };

  const saveNewTraining = () => {
    addTrainingRecord({ ...newTraining });
    setModal(null);
    Taro.showToast({ title: '训练已记录', icon: 'success' });
    Taro.vibrateShort({ type: 'medium' });
  };

  // --- 编辑训练记录 ---
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [editPatch, setEditPatch] = useState<Partial<TrainingRecord> & { dateKey?: string }>({});

  const openEditTraining = (r: TrainingRecord) => {
    setEditingRecord(r);
    setEditPatch({ dateKey: r.date });
    setModal('editTraining');
  };
  const saveEditTraining = () => {
    if (!editingRecord) return;
    updateTrainingRecord(editingRecord.id, editPatch);
    setModal(null);
    Taro.showToast({ title: '已更新', icon: 'success' });
    Taro.vibrateShort({ type: 'light' });
  };

  // --- 数据联动：周切换时清空选中日 ---
  const trend = useMemo(() => getWeeklyTrend(weekOffset), [
    weekOffset,
    assessments.length,
    painRecords.length,
    trainingRecords.length,
    reminders.length,
    reminders.some(r => r.done),
    trainingRecords.some(t => t.completed)
  ]);

  const stats = useMemo(() => getWeeklyTrainingStats(weekOffset), [
    weekOffset, trainingRecords.length, trainingRecords
  ]);

  const weekLabel = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const recoverySum = getRecoveryStatusSummary();
  const avgRiskWeek = useMemo(() => {
    const recent = trend.filter(t => t.assessmentCount > 0);
    if (recent.length === 0) return 0;
    return Math.round(recent.reduce((s, t) => s + t.riskScore, 0) / recent.length);
  }, [trend]);

  const filteredCards = useMemo(() => {
    return cat === 'all' ? KNOWLEDGE_CARDS : KNOWLEDGE_CARDS.filter(c => c.category === cat);
  }, [cat]);

  const bmi = Math.round(userProfile.weight / Math.pow(userProfile.height / 100, 2) * 10) / 10;
  const bmiColor = bmi < 18.5 ? '#3B82F6' : bmi <= 24 ? '#10B981' : bmi <= 28 ? '#F59E0B' : '#EF4444';

  const getMetricVal = (day: any, m: TrendMetric) => {
    switch (m) {
      case 'risk': return day.riskScore;
      case 'pain': return day.painCount;
      case 'recovery': return day.recoveryImprovingCount;
      case 'training': return day.trainingMinutes; // 用分钟画柱子
      default: return 0;
    }
  };
  const metricMax = useMemo(() => {
    const vals = trend.map(d => getMetricVal(d, trendMetric));
    let defMax = 60;
    if (trendMetric === 'pain') defMax = 3;
    if (trendMetric === 'recovery') defMax = 3;
    if (trendMetric === 'training') defMax = 120; // 120分钟（2小时）
    const max = Math.max(...vals, defMax);
    return Math.max(max, 1);
  }, [trend, trendMetric]);

  // --- 训练记录筛选（按周+按运动类型） ---
  const weekTrainingRecords = useMemo(() => {
    const { startKey, endKey } = getWeekRange(weekOffset);
    const inRange = trainingRecords
      .filter(t => t.date >= startKey && t.date <= endKey)
      .filter(t => sportFilter === 'all' || t.sportType === sportFilter)
      .sort((a, b) => b.timestamp - a.timestamp);
    return inRange;
  }, [trainingRecords, weekOffset, sportFilter]);

  const painCountWeek = trend.reduce((s, t) => s + t.painCount, 0);
  const recoveryCountWeek = trend.reduce((s, t) => s + t.recoveryImprovingCount, 0);

  // --- 所选日详情 ---
  const selectedDay = selectedDateKey ? trend.find(t => t.dateKey === selectedDateKey) : null;

  const sportIcon = (s: SportType) => SPORT_OPTIONS.find(o => o.key === s)?.icon || '🏃';
  const topSportName = stats.topSport ? getSportTypeName(stats.topSport) : null;
  const totalMinutes = stats.totalMinutes;
  const hoursDisplay = Math.floor(totalMinutes / 60);
  const minsDisplay = totalMinutes % 60;

  const handleCall = () => {
    Taro.makePhoneCall({ phoneNumber: userProfile.emergencyContact || '120' }).catch(() => {});
  };

  const showRice = () => {
    Taro.showModal({
      title: 'R.I.C.E 原则详解',
      content: EMERGENCY_RULES.riceProtocol.map(r => `${r.step} - ${r.title}：${r.desc}`).join('\n\n'),
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#10B981'
    });
  };

  const handleDeleteTraining = (id: string) => {
    Taro.showModal({
      title: '删除训练记录',
      content: '确认删除这条训练记录？周报统计也会同步更新。',
      confirmText: '删除', confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          deleteTrainingRecord(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  // --- 补录训练的日期快捷选项（当前周 7 天） ---
  const quickDates = useMemo(() => trend.map(t => ({
    key: t.dateKey, label: `${t.date} ${t.dayOfWeek}`
  })), [trend]);

  const currentRiskLevel = getLatestRiskLevel();

  return (
    <ScrollView scrollY className={styles.page}>
      {/* --- 个人资料卡 --- */}
      <View className={styles.profileCard}>
        <View className={styles.profileTop}>
          <View className={styles.avatar}>
            {userProfile.gender === 'female' ? '👩' : userProfile.gender === 'other' ? '🧑' : '👨'}
          </View>
          <View className={styles.info}>
            <Text className={styles.userName}>{userProfile.name}</Text>
            <Text className={styles.userSport}>
              {sportIcon(userProfile.mainSport)} 主项：{getSportTypeName(userProfile.mainSport)} · 每周{userProfile.trainingFrequency}次
            </Text>
            <Text className={styles.userContact}>🚨 紧急联系人：{userProfile.emergencyContact}</Text>
          </View>
        </View>

        <View className={styles.bioInfo}>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum}>{userProfile.age}</Text>
            <Text className={styles.bioLabel}>年龄</Text>
          </View>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum}>{userProfile.height}</Text>
            <Text className={styles.bioLabel}>身高</Text>
          </View>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum}>{userProfile.weight}</Text>
            <Text className={styles.bioLabel}>体重</Text>
          </View>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum} style={{ color: bmiColor }}>{bmi}</Text>
            <Text className={styles.bioLabel}>BMI</Text>
          </View>
        </View>

        <View className={styles.editBtn} onClick={openProfileModal}>✏️ 编辑个人资料</View>
      </View>

      {/* --- 周报趋势 + 周导航 + 展开详情 --- */}
      <View className={styles.sectionCard}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📊</Text>
            <Text>训练周报</Text>
            {currentRiskLevel && (
              <Text style={{
                fontSize: 22, padding: '2rpx 12rpx', borderRadius: 8,
                background: RISK_COLOR[currentRiskLevel] + '22',
                color: RISK_COLOR[currentRiskLevel], fontWeight: 600
              }}>{RISK_TEXT[currentRiskLevel]}</Text>
            )}
          </View>
        </View>

        {/* 周导航 */}
        <View className={styles.weekNav}>
          <View className={styles.weekNavBtn} onClick={() => { setWeekOffset(w => w - 1); setSelectedDateKey(null); Taro.vibrateShort({ type: 'light' }); }}>‹</View>
          <Text className={styles.weekLabel}>
            {weekLabel.label}（{weekLabel.startKey.replace(/-/g, '/').slice(5)} ~ {weekLabel.endKey.replace(/-/g, '/').slice(5)}）
          </Text>
          <View
            className={styles.weekNavBtn}
            onClick={() => { if (weekOffset < 0) { setWeekOffset(w => w + 1); setSelectedDateKey(null); } Taro.vibrateShort({ type: 'light' }); }}
          >›</View>
        </View>

        {/* 周级汇总（更清晰的展示） */}
        <View className={styles.summaryRow}>
          <View className={classnames(styles.summaryBox, styles.highlight)}>
            <Text className={styles.summaryNum}>
              {hoursDisplay}<Text className={styles.unit}>h</Text>{minsDisplay > 0 && <Text> {minsDisplay}<Text className={styles.unit}>分</Text></Text>}
            </Text>
            <Text className={styles.summaryLbl}>总训练量</Text>
          </View>
          <View className={styles.summaryBox}>
            <Text className={styles.summaryNum}>
              {stats.completionRate}<Text className={styles.unit}>%</Text>
            </Text>
            <Text className={styles.summaryLbl}>完成率 {stats.completedCount}/{stats.totalCount}</Text>
          </View>
          <View className={styles.summaryBox}>
            <Text className={styles.summaryNum}>{stats.avgIntensity || '-'}</Text>
            <Text className={styles.summaryLbl}>平均强度</Text>
          </View>
        </View>

        <View className={styles.trendChart}>
          <Text className={styles.trendTitle}>
            展示维度：{TREND_METRICS.find(m => m.key === trendMetric)?.name}
            {trendMetric === 'training' && stats.totalHours > 0 && (
              <Text style={{ color: '#3B82F6', fontWeight: 600 }}>
                {' '}· 本周合计 {hoursDisplay}h {minsDisplay}分
              </Text>
            )}
          </Text>

          <View className={styles.trendTabs}>
            {TREND_METRICS.map(m => (
              <View
                key={m.key}
                className={classnames(styles.trendTab, { [styles.active]: trendMetric === m.key })}
                onClick={() => { setTrendMetric(m.key); Taro.vibrateShort({ type: 'light' }); }}
              >
                {m.name}
              </View>
            ))}
          </View>

          <View className={styles.trendRow}>
            {trend.map((day, i) => {
              const v = getMetricVal(day, trendMetric);
              const h = Math.round((v / metricMax) * 200);
              const isSelected = selectedDateKey === day.dateKey;
              const hasAct = day.trainingCount + day.reminderTotalCount + day.painCount + day.assessmentCount > 0;
              return (
                <View
                  key={i}
                  className={classnames(styles.trendBarDay, {
                    [styles.trendBarWrap]: true,
                    [styles.selected]: isSelected,
                    [styles.hasActivity]: hasAct
                  })}
                  onClick={() => {
                    setSelectedDateKey(isSelected ? null : day.dateKey);
                    Taro.vibrateShort({ type: 'light' });
                  }}
                >
                  <View className={styles.trendBars}>
                    <View
                      className={classnames(styles.trendBar, styles[trendMetric])}
                      style={{ height: `${Math.max(h, 4)}rpx` }}
                    />
                  </View>
                  <Text className={styles.trendValue}>
                    {v > 0 ? (trendMetric === 'training' ? `${Math.floor(v/60)}h${v%60}` : v) : ''}
                  </Text>
                  <Text className={styles.trendLabel}>{day.date}</Text>
                  <Text style={{ fontSize: 18, color: '#94A3B8', marginTop: 2 }}>{day.dayOfWeek}</Text>
                </View>
              );
            })}
          </View>

          <View className={styles.trendLegend}>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#F59E0B' }} />
              <Text>风险（周均 {avgRiskWeek}）</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#EF4444' }} />
              <Text>疼痛（本周 {painCountWeek}）</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#8B5CF6' }} />
              <Text>好转（本周 {recoveryCountWeek}）</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#3B82F6' }} />
              <Text>训练（{stats.totalCount}次）</Text>
            </View>
          </View>
        </View>

        {/* --- 选中日详情 --- */}
        {selectedDay && (
          <View className={styles.dayDetailPanel}>
            <View className={styles.dayDetailHeader}>
              <Text className={styles.dayDetailTitle}>
                <Text className={styles.dot}>●</Text>
                {selectedDay.date} {selectedDay.dayOfWeek} 详情
              </Text>
              <View
                style={{
                  padding: '6rpx 20rpx', borderRadius: 32,
                  background: '#fff',
                  color: '#6366F1',
                  border: '2rpx solid #C7D2FE',
                  fontSize: 22, fontWeight: 600
                }}
                onClick={() => openNewTraining(selectedDay.dateKey)}
              >＋ 补录训练</View>
            </View>

            <View className={styles.daySummaryBadges}>
              {selectedDay.riskLevel && (
                <View className={classnames(styles.badge, styles.risk)}>
                  {RISK_TEXT[selectedDay.riskLevel]} {selectedDay.riskScore}分
                </View>
              )}
              {selectedDay.painCount > 0 && (
                <View className={classnames(styles.badge, styles.pain)}>
                  😣 疼痛{selectedDay.painCount}次（均{selectedDay.avgPainLevel}）
                </View>
              )}
              <View className={classnames(styles.badge, styles.pend)}>
                📋 待处理提醒{selectedDay.reminderTotalCount - selectedDay.reminderCompletedCount}
              </View>
              {selectedDay.reminderCompletedCount > 0 && (
                <View className={classnames(styles.badge, styles.done)}>
                  ✅ 已完成{selectedDay.reminderCompletedCount}
                </View>
              )}
            </View>

            {/* 训练部分 */}
            <Text className={styles.detailSubTitle}>🏋️ 训练项目（{selectedDay.trainingCount}次 / 合计{selectedDay.trainingMinutes}分）</Text>
            {selectedDay.trainingRecords.length > 0 ? selectedDay.trainingRecords.map((t: TrainingRecord) => (
              <View key={t.id} className={classnames(styles.miniTraining, { [styles.pending]: !t.completed })}>
                <View className={styles.miniTrainInfo}>
                  <Text className={styles.title}>
                    {sportIcon(t.sportType)} {getSportTypeName(t.sportType)}训练
                    {t.sets && t.sets > 0 && <Text style={{ fontSize: 22, color: '#64748B' }}> · {t.sets}组</Text>}
                  </Text>
                  <Text className={styles.meta}>
                    💪 强度{t.intensity}/5
                    {t.note ? ` · ${t.note}` : ''}
                    {!t.completed && <Text style={{ color: '#F59E0B' }}> · 计划中</Text>}
                  </Text>
                </View>
                <View className={styles.miniTrainStats}>
                  <Text className={styles.num}>{t.duration}</Text>
                  <Text className={styles.label}>分钟</Text>
                </View>
              </View>
            )) : (
              <View className={styles.detailEmpty}>当日暂无训练记录</View>
            )}

            {/* 提醒部分 */}
            <Text className={styles.detailSubTitle}>
              📌 日程提醒（已处理 {selectedDay.reminderCompletedCount}/{selectedDay.reminderTotalCount}）
            </Text>
            {selectedDay.reminders.length > 0 ? selectedDay.reminders.map((r: ReminderItem) => (
              <View key={r.id} className={classnames(styles.miniReminder, styles[r.type], { [styles.doneItem]: r.done })}>
                <View className={classnames(styles.miniRemInfo, styles[r.type], { [styles.doneItem]: r.done })}>
                  <Text className={styles.title}>
                    <View className={styles.tag}>{REM_TEXT[r.type]}</View>
                    {r.title}
                  </Text>
                </View>
                <View className={styles.miniRemActions}>
                  <View
                    className={classnames(styles.tick, { [styles.checked]: r.done })}
                    onClick={() => { toggleReminder(r.id); Taro.vibrateShort({ type: 'light' }); }}
                  >{r.done ? '✓' : ''}</View>
                </View>
              </View>
            )) : (
              <View className={styles.detailEmpty}>当日暂无日程</View>
            )}
          </View>
        )}

        {/* 汇总4格 */}
        <View className={styles.statsGrid}>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, {
              [styles.warn]: avgRiskWeek >= 35 && avgRiskWeek < 60,
              [styles.danger]: avgRiskWeek >= 60
            })}>
              {avgRiskWeek}
            </Text>
            <Text className={styles.statLabel}>周均风险</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, { [styles.danger]: painCountWeek > 3 })}>{painCountWeek}</Text>
            <Text className={styles.statLabel}>本周疼痛</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum} style={{ color: '#8B5CF6' }}>
              {recoverySum.improving + recoverySum.recovered}
            </Text>
            <Text className={styles.statLabel}>好转次数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum} style={{ color: '#3B82F6' }}>
              {stats.totalHours}<Text style={{ fontSize: 20 }}>h</Text>
            </Text>
            <Text className={styles.statLabel}>训练时长</Text>
          </View>
        </View>

        {/* --- 训练记录（本周） --- */}
        <View className={styles.trainingSection}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <Text className={styles.sectionIcon}>🏋️</Text>
              <Text>训练记录</Text>
              {topSportName && (
                <View className={styles.topSportBadge}>🏆 最常练：{topSportName}</View>
              )}
            </View>
          </View>

          {/* 运动类型分布 */}
          {Object.keys(stats.bySport).length > 0 && (
            <View className={styles.sportBreakdown}>
              {Object.entries(stats.bySport).map(([k, v]) => {
                const pct = Math.round(v.minutes / Math.max(totalMinutes, 1) * 100);
                return (
                  <View key={k} className={styles.breakdownRow}>
                    <Text className={styles.bdIcon}>{sportIcon(k as SportType)}</Text>
                    <Text className={styles.bdName}>{getSportTypeName(k)} · {v.count}次</Text>
                    <View className={styles.bdBar}>
                      <View className={styles.bdFill} style={{ width: `${pct}%` }} />
                    </View>
                    <Text className={styles.bdVal}>
                      {Math.floor(v.minutes / 60)}h{v.minutes % 60}分
                    </Text>
                  </View>
                );
              })}
              {stats.totalSets > 0 && (
                <View className={styles.breakdownRow}>
                  <Text className={styles.bdIcon}>🎯</Text>
                  <Text className={styles.bdName}>总组数</Text>
                  <View className={styles.bdBar} />
                  <Text className={styles.bdVal} style={{ color: '#6366F1', fontWeight: 700 }}>{stats.totalSets} 组</Text>
                </View>
              )}
            </View>
          )}

          {/* 筛选 + 新增 */}
          <View className={styles.toolbar}>
            {SPORT_FILTER.map(f => (
              <View
                key={f.key}
                className={classnames(styles.filterChip, { [styles.active]: sportFilter === f.key })}
                onClick={() => { setSportFilter(f.key); Taro.vibrateShort({ type: 'light' }); }}
              >
                {f.icon} {f.name}
              </View>
            ))}
          </View>

          <Button className={styles.addTrainingBtn} onClick={() => openNewTraining(todayKey)}>
            ＋ 记录训练
          </Button>
          <Text className={styles.smallHint}>💡 点击任意日期可补录对应日期训练记录</Text>

          {weekTrainingRecords.length > 0 ? weekTrainingRecords.map(t => (
            <View key={t.id} className={classnames(styles.trainingItem, { [styles.done]: t.completed })}>
              <View className={styles.trainingIcon}>{sportIcon(t.sportType)}</View>
              <View className={styles.trainingInfo}>
                <Text className={styles.trainingName}>
                  {getSportTypeName(t.sportType)}训练
                  {t.sets && t.sets > 0 && <Text style={{ fontSize: 22, color: '#64748B', fontWeight: 400 }}> · {t.sets}组</Text>}
                  {t.note && <Text style={{ fontSize: 22, color: '#94A3B8', fontWeight: 400 }}> · {t.note}</Text>}
                </Text>
                <View className={styles.trainingMeta}>
                  <Text style={{ color: '#64748B', fontSize: 22 }}>{t.date}</Text>
                  <View className={styles.tmTag}>⏱ {t.duration}分钟</View>
                  <View className={styles.tmTag}>💪 强度{t.intensity}/5</View>
                  {t.completed ? (
                    <View className={styles.tmTag} style={{ background: '#ECFDF5', color: '#059669' }}>已完成</View>
                  ) : (
                    <View className={styles.tmTag} style={{ background: '#FEF3C7', color: '#D97706' }}>计划中</View>
                  )}
                </View>
              </View>
              <View className={styles.trainingActions}>
                <View className={styles.tCheck} onClick={() => { toggleTrainingRecord(t.id); Taro.vibrateShort({ type: 'light' }); }}>
                  {t.completed ? '✓' : ''}
                </View>
                <Text className={styles.editSvg} onClick={() => openEditTraining(t)}>✏️</Text>
                <Text className={styles.tDelete} onClick={() => handleDeleteTraining(t.id)}>删除</Text>
              </View>
            </View>
          )) : (
            <View className={styles.emptyHint}>
              {sportFilter !== 'all' ? `本周无${getSportTypeName(sportFilter)}记录` : '本周暂无训练记录'}
            </View>
          )}
        </View>
      </View>

      {/* --- 知识库 --- */}
      <View className={styles.sectionCard}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📚</Text>
            <Text>伤病知识库</Text>
          </View>
          <Text className={styles.moreBtn}>{KNOWLEDGE_CARDS.length}篇文章</Text>
        </View>

        <View className={styles.categoryTabs}>
          {CATS.map(c => (
            <View
              key={c.key}
              className={classnames(styles.catTab, { [styles.active]: cat === c.key })}
              onClick={() => { setCat(c.key); Taro.vibrateShort({ type: 'light' }); }}
            >
              {c.name}
            </View>
          ))}
        </View>

        {filteredCards.slice(0, 4).map(card => (
          <KnowledgeCard key={card.id} card={card} />
        ))}

        {filteredCards.length > 4 && (
          <Button
            style={{
              width: '100%', height: 80, borderRadius: 48,
              background: '#F1F5F9', color: '#64748B',
              fontSize: 28, border: 'none', marginTop: 16
            }}
            onClick={() => Taro.showToast({ title: '更多内容开发中', icon: 'none' })}
          >
            查看更多 ({filteredCards.length - 4}) →
          </Button>
        )}
      </View>

      {/* --- 实用工具 + 紧急联系 --- */}
      <View className={styles.sectionCard}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>⚙️</Text>
            <Text>实用工具</Text>
          </View>
        </View>

        <View className={styles.featureGrid}>
          <View className={styles.featureItem} onClick={showRice}>
            <Text className={styles.featureIcon}>🩹</Text>
            <Text className={styles.featureText}>RICE原则</Text>
          </View>
          <View className={styles.featureItem} onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className={styles.featureIcon}>🩺</Text>
            <Text className={styles.featureText}>在线问诊</Text>
          </View>
          <View className={styles.featureItem} onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className={styles.featureIcon}>📍</Text>
            <Text className={styles.featureText}>附近医院</Text>
          </View>
          <View className={styles.featureItem} onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className={styles.featureIcon}>📤</Text>
            <Text className={styles.featureText}>导出报告</Text>
          </View>
        </View>

        <View className={styles.emergencyContact}>
          <View className={styles.emergencyText}>
            <Text className={styles.emergencyTitle}>🚨 紧急联系电话</Text>
            <Text className={styles.emergencyNum}>{userProfile.emergencyContact || '120'}</Text>
          </View>
          <Button className={styles.callBtn} onClick={handleCall}>📞</Button>
        </View>
      </View>

      <View className={styles.footer}>
        运动损伤预防 v1.1.0{'\n'}
        ⚠️ 本小程序仅供参考，严重损伤请及时就医
      </View>

      {/* --- 编辑个人资料 Modal --- */}
      {modal === 'profile' && (
        <View className={styles.modalMask} onClick={() => setModal(null)}>
          <View className={styles.modalContent} onClick={e => e.stopPropagation && e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>编辑个人资料</Text>
              <View className={styles.modalClose} onClick={() => setModal(null)}>×</View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>昵称</Text>
              <Input className={styles.formInput} value={editProfile.name}
                onInput={e => setEditProfile({ ...editProfile, name: e.detail.value })} maxlength={20} />
            </View>

            <View className={styles.formRow}>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>年龄</Text>
                  <Input className={styles.formInput} type="number" value={String(editProfile.age)}
                    onInput={e => setEditProfile({ ...editProfile, age: parseInt(e.detail.value) || 0 })} />
                </View>
              </View>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>性别</Text>
                  <View className={styles.optionGroup}>
                    {[{ k: 'male', n: '男' }, { k: 'female', n: '女' }, { k: 'other', n: '其他' }].map(o => (
                      <View key={o.k}
                        className={classnames(styles.optionItem, { [styles.selected]: editProfile.gender === o.k })}
                        onClick={() => setEditProfile({ ...editProfile, gender: o.k as any })}
                      >{o.n}</View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>身高(cm)</Text>
                  <Input className={styles.formInput} type="digit" value={String(editProfile.height)}
                    onInput={e => setEditProfile({ ...editProfile, height: parseInt(e.detail.value) || 0 })} />
                </View>
              </View>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>体重(kg)</Text>
                  <Input className={styles.formInput} type="digit" value={String(editProfile.weight)}
                    onInput={e => setEditProfile({ ...editProfile, weight: parseInt(e.detail.value) || 0 })} />
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>常用运动</Text>
              <View className={styles.optionGroup}>
                {SPORT_OPTIONS.map(o => (
                  <View key={o.key}
                    className={classnames(styles.optionItem, { [styles.selected]: editProfile.mainSport === o.key })}
                    onClick={() => setEditProfile({ ...editProfile, mainSport: o.key })}
                  >{o.icon} {o.name}</View>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>每周训练频次</Text>
                <Text className={styles.sliderValue}>{editProfile.trainingFrequency} 次/周</Text>
              </View>
              <Slider min={0} max={7} step={1} value={editProfile.trainingFrequency}
                activeColor="#10B981" blockColor="#10B981" blockSize={28}
                onChange={e => setEditProfile({ ...editProfile, trainingFrequency: e.detail.value })} />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>紧急联系人电话</Text>
              <Input className={styles.formInput} type="number" value={editProfile.emergencyContact}
                onInput={e => setEditProfile({ ...editProfile, emergencyContact: e.detail.value })}
                maxlength={15} placeholder="如120或家人电话" />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>过敏史/慢性病</Text>
              <Input className={styles.formInput} value={editProfile.allergies}
                onInput={e => setEditProfile({ ...editProfile, allergies: e.detail.value })}
                placeholder="无" maxlength={50} />
            </View>

            <View className={styles.modalBtnRow}>
              <Button className={classnames(styles.modalBtn, styles.secondary)} onClick={() => setModal(null)}>取消</Button>
              <Button className={classnames(styles.modalBtn, styles.primary)} onClick={saveProfile}>保存资料</Button>
            </View>
          </View>
        </View>
      )}

      {/* --- 新增 / 补录训练 Modal --- */}
      {(modal === 'training' || modal === 'editTraining') && (
        <View className={styles.modalMask} onClick={() => setModal(null)}>
          <View className={styles.modalContent} onClick={e => e.stopPropagation && e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>
                {modal === 'editTraining' ? '编辑训练记录' : '记录训练（支持补录）'}
              </Text>
              <View className={styles.modalClose} onClick={() => setModal(null)}>×</View>
            </View>

            {/* 日期选择（补录） */}
            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>选择日期</Text>
              <View className={styles.datePickerRow}>
                {quickDates.slice(-7).map(d => (
                  <View key={d.key}
                    className={classnames(styles.dateQuickTag, {
                      [styles.selected]: (modal === 'editTraining' ? editingRecord?.date === d.key : newTraining.dateKey === d.key)
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
              <Text className={styles.smallHint}>💡 支持补录本周任意一天的训练，点击柱状图也可以直接从日期切入</Text>
            </View>

            {/* 类型 */}
            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>运动类型</Text>
              <View className={styles.optionGroup}>
                {SPORT_OPTIONS.map(o => {
                  const val = modal === 'editTraining' ? editingRecord?.sportType : newTraining.sportType;
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
                  {modal === 'editTraining' ? (editPatch.duration ?? editingRecord?.duration ?? 45) : newTraining.duration} 分钟
                  <Text style={{ fontSize: 22, fontWeight: 400, color: '#64748B' }}>
                    （约{Math.round(((modal === 'editTraining' ? (editPatch.duration ?? editingRecord?.duration ?? 45) : newTraining.duration) / 60) * 10) / 10} 小时）
                  </Text>
                </Text>
              </View>
              <Slider min={10} max={180} step={5}
                value={modal === 'editTraining' ? (editPatch.duration ?? editingRecord?.duration ?? 45) : newTraining.duration}
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
                  {(modal === 'editTraining' ? (editPatch.intensity ?? editingRecord?.intensity ?? 3) : newTraining.intensity)}/5
                  <Text style={{ fontSize: 22, fontWeight: 400, color: '#64748B' }}>
                    （{['', '轻松', '较低', '中等', '较高', '极限'][modal === 'editTraining' ? (editPatch.intensity ?? editingRecord?.intensity ?? 3) : newTraining.intensity]}）
                  </Text>
                </Text>
              </View>
              <Slider min={1} max={5} step={1}
                value={modal === 'editTraining' ? (editPatch.intensity ?? editingRecord?.intensity ?? 3) : newTraining.intensity}
                activeColor={[0, '', '#10B981', '#10B981', '#F59E0B', '#EF4444'][modal === 'editTraining' ? (editPatch.intensity ?? editingRecord?.intensity ?? 3) : newTraining.intensity]}
                blockColor={[0, '', '#10B981', '#10B981', '#F59E0B', '#EF4444'][modal === 'editTraining' ? (editPatch.intensity ?? editingRecord?.intensity ?? 3) : newTraining.intensity]}
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
                  {modal === 'editTraining' ? (editPatch.sets ?? editingRecord?.sets ?? 0) : newTraining.sets} 组
                </Text>
              </View>
              <Slider min={0} max={20} step={1}
                value={modal === 'editTraining' ? (editPatch.sets ?? editingRecord?.sets ?? 0) : newTraining.sets}
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
                value={modal === 'editTraining' ? (editPatch.note ?? editingRecord?.note ?? '') : newTraining.note}
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

export default ProfilePage;
