import React, { useState, useMemo } from 'react';
import { View, Text, Button, Slider, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { BodyPart } from '@/types';
import { BODY_PART_NAMES, calculateRisk } from '@/utils/risk';
import { useAppStore } from '@/store/app';
import RiskCard from '@/components/RiskCard';

const BODY_PARTS: BodyPart[] = ['neck', 'shoulder', 'elbow', 'wrist', 'back', 'waist', 'hip', 'knee', 'calf', 'ankle', 'foot', 'chest'];

const TOTAL_STEPS = 4;

const RiskPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [intensity, setIntensity] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [hasHistory, setHasHistory] = useState<boolean | null>(null);
  const [historyParts, setHistoryParts] = useState<BodyPart[]>([]);
  const [result, setResult] = useState<null | { level: any; score: number; suggestions: string[] }>(null);

  const { assessments, addAssessment } = useAppStore();

  const intensityLabels = ['', '轻度', '较低', '中等', '较高', '高强度'];
  const intensityTips = [
    '',
    '日常散步、瑜伽等轻度活动',
    '慢跑、快走、轻松骑行',
    '常规训练、中等强度有氧',
    '间歇训练、力量训练',
    '比赛、冲刺、极限力量训练'
  ];

  const sleepLabels = ['', '很差', '较差', '一般', '较好', '优秀'];
  const sleepTips = [
    '',
    '严重失眠，不足4小时',
    '入睡困难，约4-5小时',
    '偶尔醒来，约5-6小时',
    '睡眠较好，6-7小时',
    '深度睡眠，7-8小时以上'
  ];

  const toggleBodyPart = (p: BodyPart, isHistory = false) => {
    if (isHistory) {
      setHistoryParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    } else {
      setBodyParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    }
  };

  const canNext = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return hasHistory !== null && (hasHistory === false || historyParts.length > 0);
    return true;
  }, [step, hasHistory, historyParts]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      const r = calculateRisk({ bodyParts, intensity, sleepQuality, hasHistory: hasHistory!, historyParts });
      setResult(r);
      addAssessment({
        bodyParts,
        intensity,
        sleepQuality,
        hasHistory: hasHistory!,
        historyParts,
        riskLevel: r.level,
        score: r.score,
        suggestions: r.suggestions
      });
      Taro.vibrateShort({ type: 'medium' });
      Taro.showToast({ title: '评估完成', icon: 'success' });
      setStep(TOTAL_STEPS);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleReset = () => {
    setStep(0);
    setBodyParts([]);
    setIntensity(3);
    setSleepQuality(4);
    setHasHistory(null);
    setHistoryParts([]);
    setResult(null);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.heroCard}>
        <Text className={styles.heroTitle}>🏃 运动损伤风险自测</Text>
        <Text className={styles.heroSubtitle}>通过科学问卷评估您的受伤风险，获取个性化防护建议，让训练更安全更高效</Text>
        <View className={styles.heroStats}>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{assessments.length}</Text>
            <Text className={styles.statLabel}>已评估次数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>4</Text>
            <Text className={styles.statLabel}>评估维度</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>98%</Text>
            <Text className={styles.statLabel}>准确度</Text>
          </View>
        </View>
      </View>

      {step < TOTAL_STEPS && (
        <View className={styles.stepIndicator}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <React.Fragment key={i}>
              <View className={classnames(styles.stepDot, { [styles.active]: step === i, [styles.done]: step > i })}>
                {step > i ? '✓' : i + 1}
              </View>
              {i < TOTAL_STEPS - 1 && (
                <View className={classnames(styles.stepLine, { [styles.done]: step > i })} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {step === 0 && (
        <View className={styles.questionCard}>
          <Text className={styles.qTitle}>① 身体部位不适情况</Text>
          <Text className={styles.qDesc}>请选择您目前感到不适或有症状的部位（可多选），无症状请直接下一步</Text>

          <View className={styles.bodyGrid}>
            {BODY_PARTS.map(p => (
              <View
                key={p}
                className={classnames(styles.bodyItem, { [styles.selected]: bodyParts.includes(p) })}
                onClick={() => toggleBodyPart(p)}
              >
                {BODY_PART_NAMES[p]}
              </View>
            ))}
          </View>

          {bodyParts.length > 0 && (
            <View style={{ marginTop: 32, padding: 24, background: '#FEF3C7', borderRadius: 12, fontSize: 26, color: '#92400E', lineHeight: 1.6 }}>
              已选择 {bodyParts.length} 个不适部位：{bodyParts.map(p => BODY_PART_NAMES[p]).join('、')}，将增加风险评分
            </View>
          )}
        </View>
      )}

      {step === 1 && (
        <View className={styles.questionCard}>
          <Text className={styles.qTitle}>② 训练强度评估</Text>
          <Text className={styles.qDesc}>请评估您未来1-2天计划进行的训练强度</Text>

          <View className={styles.sliderWrap}>
            <View className={styles.sliderValue}>
              <Text style={{ fontSize: 28, color: '#64748B' }}>当前强度等级</Text>
              <View>
                <Text className={styles.sliderNum}>{intensity}</Text>
                <Text style={{ fontSize: 32, color: '#94A3B8', fontWeight: 500 }}> /5  {intensityLabels[intensity]}</Text>
              </View>
            </View>

            <Slider
              min={1}
              max={5}
              step={1}
              value={intensity}
              activeColor="#10B981"
              backgroundColor="#E2E8F0"
              blockColor="#10B981"
              blockSize={28}
              onChange={(e) => setIntensity(e.detail.value)}
              style={{ margin: '32rpx 0' }}
            />

            <View className={styles.sliderLabels}>
              {[1, 2, 3, 4, 5].map(v => (
                <Text key={v} style={{ color: intensity === v ? '#10B981' : '#94A3B8', fontWeight: intensity === v ? 600 : 400 }}>{v}</Text>
              ))}
            </View>

            <View className={styles.sliderTips}>
              💡 {intensityTips[intensity]}
            </View>
          </View>
        </View>
      )}

      {step === 2 && (
        <View className={styles.questionCard}>
          <Text className={styles.qTitle}>③ 近期睡眠质量</Text>
          <Text className={styles.qDesc}>睡眠不足会显著增加运动损伤风险，请如实评估近3天睡眠状况</Text>

          <View className={styles.sliderWrap}>
            <View className={styles.sliderValue}>
              <Text style={{ fontSize: 28, color: '#64748B' }}>睡眠质量评分</Text>
              <View>
                <Text className={styles.sliderNum}>{sleepQuality}</Text>
                <Text style={{ fontSize: 32, color: '#94A3B8', fontWeight: 500 }}> /5  {sleepLabels[sleepQuality]}</Text>
              </View>
            </View>

            <Slider
              min={1}
              max={5}
              step={1}
              value={sleepQuality}
              activeColor="#3B82F6"
              backgroundColor="#E2E8F0"
              blockColor="#3B82F6"
              blockSize={28}
              onChange={(e) => setSleepQuality(e.detail.value)}
              style={{ margin: '32rpx 0' }}
            />

            <View className={styles.sliderLabels}>
              {[1, 2, 3, 4, 5].map(v => (
                <Text key={v} style={{ color: sleepQuality === v ? '#3B82F6' : '#94A3B8', fontWeight: sleepQuality === v ? 600 : 400 }}>{v}</Text>
              ))}
            </View>

            <View className={styles.sliderTips} style={{ background: '#DBEAFE', color: '#1E40AF' }}>
              😴 {sleepTips[sleepQuality]}
            </View>
          </View>
        </View>
      )}

      {step === 3 && (
        <View className={styles.questionCard}>
          <Text className={styles.qTitle}>④ 既往损伤史</Text>
          <Text className={styles.qDesc}>同一部位的重复损伤风险会大幅增加，请如实填写</Text>

          <View className={styles.radioGroup}>
            <View
              className={classnames(styles.radioItem, { [styles.selected]: hasHistory === true })}
              onClick={() => setHasHistory(true)}
            >
              <View className={styles.radioCircle} />
              <Text className={styles.radioLabel}>是，我有过运动损伤史</Text>
            </View>
            <View
              className={classnames(styles.radioItem, { [styles.selected]: hasHistory === false })}
              onClick={() => { setHasHistory(false); setHistoryParts([]); }}
            >
              <View className={styles.radioCircle} />
              <Text className={styles.radioLabel}>否，从未受过运动损伤</Text>
            </View>
          </View>

          {hasHistory === true && (
            <View style={{ marginTop: 48 }}>
              <Text style={{ fontSize: 28, fontWeight: 600, color: '#1E293B', marginBottom: 24, display: 'block' }}>
                请选择受过伤的部位（可多选）：
              </Text>
              <View className={styles.bodyGrid}>
                {BODY_PARTS.map(p => (
                  <View
                    key={p}
                    className={classnames(styles.bodyItem, { [styles.selected]: historyParts.includes(p) })}
                    onClick={() => toggleBodyPart(p, true)}
                  >
                    {BODY_PART_NAMES[p]}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {step === TOTAL_STEPS && result && (
        <View>
          <RiskCard
            level={result.level as any}
            score={result.score}
            suggestions={result.suggestions}
          />
          <View className={styles.buttonRow}>
            <Button
              className={classnames(styles.btn, styles.secondary)}
              onClick={handleReset}
            >
              🔄 重新评估
            </Button>
          </View>

          {assessments.length > 1 && (
            <View className={styles.historySection}>
              <View className={styles.historyTitle}>
                <Text>📊 历史评估记录</Text>
                <Text className={styles.historyCount}>共 {assessments.length - 1} 条</Text>
              </View>
              {assessments.slice(1, 6).map(a => (
                <View key={a.id} style={{
                  padding: 24, background: '#fff', borderRadius: 12, marginBottom: 16,
                  borderLeft: `6rpx solid ${a.score >= 60 ? '#EF4444' : a.score >= 35 ? '#F59E0B' : '#10B981'}`
                }}>
                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: 500 }}>
                      风险评分：{a.score} 分
                    </Text>
                    <Text style={{
                      fontSize: 24, padding: '6rpx 16rpx', borderRadius: 8,
                      background: a.score >= 60 ? '#FEE2E2' : a.score >= 35 ? '#FEF3C7' : '#ECFDF5',
                      color: a.score >= 60 ? '#DC2626' : a.score >= 35 ? '#D97706' : '#059669'
                    }}>
                      {a.score >= 60 ? '高风险' : a.score >= 35 ? '中风险' : '低风险'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 22, color: '#94A3B8', marginTop: 8 }}>
                    {new Date(a.timestamp).toLocaleString('zh-CN')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {step < TOTAL_STEPS && (
        <View className={styles.buttonRow}>
          {step > 0 && (
            <Button
              className={classnames(styles.btn, styles.secondary)}
              onClick={handlePrev}
            >
              上一步
            </Button>
          )}
          <Button
            className={classnames(styles.btn, styles.primary, { [styles.disabled]: !canNext })}
            onClick={handleNext}
            disabled={!canNext}
          >
            {step === TOTAL_STEPS - 1 ? '生成评估报告' : '下一步'}
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

export default RiskPage;
