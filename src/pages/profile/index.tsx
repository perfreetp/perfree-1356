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
import { SportType, UserProfile } from '@/types';

type KnowledgeCat = 'all' | 'prevention' | 'treatment' | 'recovery' | 'emergency';
type TrendMetric = 'risk' | 'pain' | 'recovery' | 'training';
type ModalType = 'profile' | 'training' | null;

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
  { key: 'training', name: '训练时长', unit: 'h' }
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const ProfilePage: React.FC = () => {
  const {
    userProfile,
    updateProfile,
    getWeeklyTrend,
    getWeeklyTrainingStats,
    getRecoveryStatusSummary,
    assessments,
    painRecords,
    reminders,
    trainingRecords,
    addTrainingRecord,
    toggleTrainingRecord,
    deleteTrainingRecord
  } = useAppStore();

  const [cat, setCat] = useState<KnowledgeCat>('all');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('risk');
  const [modal, setModal] = useState<ModalType>(null);

  // --- 个人资料编辑 ---
  const [editProfile, setEditProfile] = useState<UserProfile>(userProfile);

  const openProfileModal = () => {
    setEditProfile({ ...userProfile });
    setModal('profile');
  };

  const saveProfile = () => {
    updateProfile(editProfile);
    setModal(null);
    Taro.showToast({ title: '资料已保存', icon: 'success' });
    Taro.vibrateShort({ type: 'medium' });
  };

  // --- 训练记录 ---
  const [newTraining, setNewTraining] = useState({
    sportType: userProfile.mainSport as SportType,
    duration: 45,
    intensity: 3,
    note: '',
    completed: true
  });

  const openTrainingModal = () => {
    setNewTraining({ sportType: userProfile.mainSport, duration: 45, intensity: 3, note: '', completed: true });
    setModal('training');
  };

  const saveTraining = () => {
    addTrainingRecord(newTraining);
    setModal(null);
    Taro.showToast({ title: '训练已记录', icon: 'success' });
    Taro.vibrateShort({ type: 'medium' });
  };

  const handleDeleteTraining = (id: string) => {
    Taro.showModal({
      title: '删除训练记录',
      content: '确认删除这条训练记录？周报统计也会同步更新。',
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

  // --- 趋势数据 ---
  const weeklyTrend = useMemo(() => getWeeklyTrend(), [
    assessments.length,
    painRecords.length,
    trainingRecords.length,
    reminders.length,
    reminders.some(r => r.done)
  ]);
  const trainingStats = useMemo(() => getWeeklyTrainingStats(), [trainingRecords.length, trainingRecords]);
  const recoverySummary = getRecoveryStatusSummary();

  const filteredCards = useMemo(() => {
    return cat === 'all' ? KNOWLEDGE_CARDS : KNOWLEDGE_CARDS.filter(c => c.category === cat);
  }, [cat]);

  const bmi = Math.round(userProfile.weight / Math.pow(userProfile.height / 100, 2) * 10) / 10;
  const bmiColor = bmi < 18.5 ? '#3B82F6' : bmi <= 24 ? '#10B981' : bmi <= 28 ? '#F59E0B' : '#EF4444';

  const getMetricValue = (day: any, metric: TrendMetric): number => {
    switch (metric) {
      case 'risk': return day.riskScore;
      case 'pain': return day.painCount;
      case 'recovery': return day.recoveryImprovingCount;
      case 'training': return day.trainingHours;
      default: return 0;
    }
  };

  const getMetricMax = (metric: TrendMetric): number => {
    const values = weeklyTrend.map(d => getMetricValue(d, metric));
    const max = Math.max(...values, metric === 'risk' ? 60 : metric === 'training' ? 2 : 3);
    return Math.max(max, 1);
  };

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

  const weekTrainingRecords = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS;
    return [...trainingRecords].filter(t => t.timestamp >= cutoff).sort((a, b) => b.timestamp - a.timestamp);
  }, [trainingRecords.length, trainingRecords]);

  const avgRisk = useMemo(() => {
    const recent = assessments.filter(a => a.timestamp >= Date.now() - WEEK_MS);
    if (recent.length === 0) return 0;
    return Math.round(recent.reduce((s, a) => s + a.score, 0) / recent.length);
  }, [assessments]);

  const painCount = painRecords.filter(r => r.timestamp >= Date.now() - WEEK_MS).length;

  const sportIcon = (s: SportType) => SPORT_OPTIONS.find(o => o.key === s)?.icon || '🏃';

  const metricMax = getMetricMax(trendMetric);

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
            <Text className={styles.userContact}>
              🚨 紧急联系人：{userProfile.emergencyContact}
            </Text>
          </View>
        </View>

        <View className={styles.bioInfo}>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum}>{userProfile.age}</Text>
            <Text className={styles.bioLabel}>年龄</Text>
          </View>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum}>{userProfile.height}</Text>
            <Text className={styles.bioLabel}>身高(cm)</Text>
          </View>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum}>{userProfile.weight}</Text>
            <Text className={styles.bioLabel}>体重(kg)</Text>
          </View>
          <View className={styles.bioItem}>
            <Text className={styles.bioNum} style={{ color: bmiColor }}>{bmi}</Text>
            <Text className={styles.bioLabel}>BMI</Text>
          </View>
        </View>

        <View className={styles.editBtn} onClick={openProfileModal}>
          ✏️ 编辑个人资料
        </View>
      </View>

      {/* --- 周报趋势 --- */}
      <View className={styles.sectionCard}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📊</Text>
            <Text>近7天数据周报</Text>
          </View>
          <Text className={styles.moreBtn}>基于真实记录</Text>
        </View>

        <View className={styles.trendChart}>
          <Text className={styles.trendTitle}>
            展示维度：{TREND_METRICS.find(m => m.key === trendMetric)?.name}（{TREND_METRICS.find(m => m.key === trendMetric)?.unit}）
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
            {weeklyTrend.map((day, i) => {
              const val = getMetricValue(day, trendMetric);
              const h = Math.round((val / metricMax) * 200);
              return (
                <View key={i} className={styles.trendBarWrap}>
                  <View className={styles.trendBars}>
                    <View
                      className={classnames(styles.trendBar, styles[trendMetric])}
                      style={{ height: `${Math.max(h, 4)}rpx` }}
                    />
                  </View>
                  <Text className={styles.trendValue}>{val > 0 ? val : ''}</Text>
                  <Text className={styles.trendLabel}>{day.date}</Text>
                </View>
              );
            })}
          </View>

          <View className={styles.trendLegend}>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#F59E0B' }} />
              <Text>风险评分</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#EF4444' }} />
              <Text>疼痛次数</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#8B5CF6' }} />
              <Text>好转记录</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#3B82F6' }} />
              <Text>训练时长</Text>
            </View>
          </View>
        </View>

        {/* 汇总统计 */}
        <View className={styles.statsGrid}>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, { [styles.warn]: avgRisk >= 35 && avgRisk < 60, [styles.danger]: avgRisk >= 60 })}>
              {avgRisk}
            </Text>
            <Text className={styles.statLabel}>周均风险</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, { [styles.danger]: painCount > 3 })}>{painCount}</Text>
            <Text className={styles.statLabel}>疼痛记录</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum} style={{ color: '#8B5CF6' }}>
              {recoverySummary.improving + recoverySummary.recovered}
            </Text>
            <Text className={styles.statLabel}>好转次数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum} style={{ color: '#3B82F6' }}>{trainingStats.totalHours}h</Text>
            <Text className={styles.statLabel}>训练时长</Text>
          </View>
        </View>

        {/* --- 训练记录（独立） --- */}
        <View className={styles.trainingSection}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <Text className={styles.sectionIcon}>🏋️</Text>
              <Text>训练记录（本周）</Text>
            </View>
          </View>

          <View className={styles.trainingStats}>
            <View className={styles.trainingStat}>
              <Text className={styles.tsNum}>{trainingStats.totalHours}h</Text>
              <Text className={styles.tsLabel}>总时长</Text>
            </View>
            <View className={styles.trainingStat}>
              <Text className={styles.tsNum}>{trainingStats.completedCount}/{trainingStats.totalCount}</Text>
              <Text className={styles.tsLabel}>完成率</Text>
            </View>
            <View className={styles.trainingStat}>
              <Text className={styles.tsNum}>{trainingStats.avgIntensity || '-'}</Text>
              <Text className={styles.tsLabel}>平均强度</Text>
            </View>
          </View>

          <Button className={styles.addTrainingBtn} onClick={openTrainingModal}>
            ＋ 记录今天的训练
          </Button>

          {weekTrainingRecords.length > 0 ? weekTrainingRecords.map(t => (
            <View key={t.id} className={classnames(styles.trainingItem, { [styles.done]: t.completed })}>
              <View className={styles.trainingIcon}>{sportIcon(t.sportType)}</View>
              <View className={styles.trainingInfo}>
                <Text className={styles.trainingName}>
                  {getSportTypeName(t.sportType)}训练
                  {t.note && <Text style={{ fontSize: 22, color: '#94A3B8', fontWeight: 400 }}> · {t.note}</Text>}
                </Text>
                <View className={styles.trainingMeta}>
                  <Text style={{ color: '#64748B', fontSize: 22 }}>
                    {new Date(t.timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </Text>
                  <View className={styles.tmTag}>⏱ {t.duration}分钟</View>
                  <View className={styles.tmTag}>💪 强度{t.intensity}/5</View>
                  {t.completed && <View className={styles.tmTag} style={{ background: '#ECFDF5', color: '#059669' }}>已完成</View>}
                </View>
              </View>
              <View className={styles.trainingActions}>
                <View
                  className={styles.tCheck}
                  onClick={() => { toggleTrainingRecord(t.id); Taro.vibrateShort({ type: 'light' }); }}
                >
                  {t.completed ? '✓' : ''}
                </View>
                <Text className={styles.tDelete} onClick={() => handleDeleteTraining(t.id)}>删除</Text>
              </View>
            </View>
          )) : (
            <View className={styles.emptyHint}>
              暂无本周训练记录，点击上方按钮开始记录
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
              width: '100%',
              height: 80,
              borderRadius: 48,
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: 28,
              border: 'none',
              marginTop: 16
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
        运动损伤预防 v1.0.0{'\n'}
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
              <Input
                className={styles.formInput}
                value={editProfile.name}
                onInput={e => setEditProfile({ ...editProfile, name: e.detail.value })}
                maxlength={20}
              />
            </View>

            <View className={styles.formRow}>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>年龄</Text>
                  <Input
                    className={styles.formInput}
                    type="number"
                    value={String(editProfile.age)}
                    onInput={e => setEditProfile({ ...editProfile, age: parseInt(e.detail.value) || 0 })}
                  />
                </View>
              </View>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>性别</Text>
                  <View className={styles.optionGroup}>
                    {[{ k: 'male', n: '男' }, { k: 'female', n: '女' }, { k: 'other', n: '其他' }].map(o => (
                      <View
                        key={o.k}
                        className={classnames(styles.optionItem, { [styles.selected]: editProfile.gender === o.k })}
                        onClick={() => setEditProfile({ ...editProfile, gender: o.k as any })}
                      >
                        {o.n}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>身高(cm)</Text>
                  <Input
                    className={styles.formInput}
                    type="digit"
                    value={String(editProfile.height)}
                    onInput={e => setEditProfile({ ...editProfile, height: parseInt(e.detail.value) || 0 })}
                  />
                </View>
              </View>
              <View className={styles.formRowItem}>
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>体重(kg)</Text>
                  <Input
                    className={styles.formInput}
                    type="digit"
                    value={String(editProfile.weight)}
                    onInput={e => setEditProfile({ ...editProfile, weight: parseInt(e.detail.value) || 0 })}
                  />
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>常用运动</Text>
              <View className={styles.optionGroup}>
                {SPORT_OPTIONS.map(o => (
                  <View
                    key={o.key}
                    className={classnames(styles.optionItem, { [styles.selected]: editProfile.mainSport === o.key })}
                    onClick={() => setEditProfile({ ...editProfile, mainSport: o.key })}
                  >
                    {o.icon} {o.name}
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>每周训练频次</Text>
                <Text className={styles.sliderValue}>{editProfile.trainingFrequency} 次/周</Text>
              </View>
              <Slider
                min={0}
                max={7}
                step={1}
                value={editProfile.trainingFrequency}
                activeColor="#10B981"
                blockColor="#10B981"
                blockSize={28}
                onChange={e => setEditProfile({ ...editProfile, trainingFrequency: e.detail.value })}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>紧急联系人电话</Text>
              <Input
                className={styles.formInput}
                type="number"
                value={editProfile.emergencyContact}
                onInput={e => setEditProfile({ ...editProfile, emergencyContact: e.detail.value })}
                maxlength={15}
                placeholder="如120或家人电话"
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>过敏史/慢性病</Text>
              <Input
                className={styles.formInput}
                value={editProfile.allergies}
                onInput={e => setEditProfile({ ...editProfile, allergies: e.detail.value })}
                placeholder="无"
                maxlength={50}
              />
            </View>

            <View className={styles.modalBtnRow}>
              <Button className={classnames(styles.modalBtn, styles.secondary)} onClick={() => setModal(null)}>
                取消
              </Button>
              <Button className={classnames(styles.modalBtn, styles.primary)} onClick={saveProfile}>
                保存资料
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* --- 新增训练 Modal --- */}
      {modal === 'training' && (
        <View className={styles.modalMask} onClick={() => setModal(null)}>
          <View className={styles.modalContent} onClick={e => e.stopPropagation && e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>记录今天的训练</Text>
              <View className={styles.modalClose} onClick={() => setModal(null)}>×</View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>运动类型</Text>
              <View className={styles.optionGroup}>
                {SPORT_OPTIONS.map(o => (
                  <View
                    key={o.key}
                    className={classnames(styles.optionItem, { [styles.selected]: newTraining.sportType === o.key })}
                    onClick={() => setNewTraining({ ...newTraining, sportType: o.key })}
                  >
                    {o.icon} {o.name}
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>训练时长</Text>
                <Text className={styles.sliderValue}>{newTraining.duration} 分钟</Text>
              </View>
              <Slider
                min={10}
                max={180}
                step={5}
                value={newTraining.duration}
                activeColor="#3B82F6"
                blockColor="#3B82F6"
                blockSize={28}
                onChange={e => setNewTraining({ ...newTraining, duration: e.detail.value })}
              />
            </View>

            <View className={styles.formGroup}>
              <View className={styles.sliderRow}>
                <Text className={styles.formLabel} style={{ margin: 0 }}>训练强度</Text>
                <Text className={styles.sliderValue}>
                  {newTraining.intensity}/5
                  <Text style={{ fontSize: 24, fontWeight: 400, color: '#64748B' }}>
                    （{['', '轻松', '较低', '中等', '较高', '极限'][newTraining.intensity]}）
                  </Text>
                </Text>
              </View>
              <Slider
                min={1}
                max={5}
                step={1}
                value={newTraining.intensity}
                activeColor={newTraining.intensity >= 4 ? '#EF4444' : newTraining.intensity >= 3 ? '#F59E0B' : '#10B981'}
                blockColor={newTraining.intensity >= 4 ? '#EF4444' : newTraining.intensity >= 3 ? '#F59E0B' : '#10B981'}
                blockSize={28}
                onChange={e => setNewTraining({ ...newTraining, intensity: e.detail.value })}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>备注（可选）</Text>
              <Input
                className={styles.formInput}
                value={newTraining.note}
                onInput={e => setNewTraining({ ...newTraining, note: e.detail.value })}
                placeholder="如：5公里配速5:30、肩推30kg等"
                maxlength={30}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>状态</Text>
              <View className={styles.optionGroup}>
                <View
                  className={classnames(styles.optionItem, { [styles.selected]: newTraining.completed })}
                  onClick={() => setNewTraining({ ...newTraining, completed: true })}
                >
                  ✅ 已完成
                </View>
                <View
                  className={classnames(styles.optionItem, { [styles.selected]: !newTraining.completed })}
                  onClick={() => setNewTraining({ ...newTraining, completed: false })}
                >
                  ⏳ 计划中
                </View>
              </View>
            </View>

            <View className={styles.modalBtnRow}>
              <Button className={classnames(styles.modalBtn, styles.secondary)} onClick={() => setModal(null)}>
                取消
              </Button>
              <Button className={classnames(styles.modalBtn, styles.primary)} onClick={saveTraining}>
                保存记录
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ProfilePage;
