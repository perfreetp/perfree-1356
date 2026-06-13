import React, { useState } from 'react';
import { View, Text, Button, Slider, Textarea, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { BodyPart } from '@/types';
import { BODY_PART_NAMES, getPainLevelText } from '@/utils/risk';
import { useAppStore } from '@/store/app';
import PainRecordCard from '@/components/PainRecordCard';

const BODY_PARTS: BodyPart[] = ['neck', 'shoulder', 'elbow', 'wrist', 'back', 'waist', 'hip', 'knee', 'calf', 'ankle', 'foot', 'chest'];

const TRIGGER_OPTIONS = ['跑步', '跳跃', '扭转', '负重', '久坐', '受凉', '睡醒后', '发力时', '无明显诱因'];
const MEASURE_OPTIONS = ['休息', '冰敷', '热敷', '按摩', '拉伸', '护具', '膏药', '止痛药', '就医', '未处理'];

const STATUSES: { key: any; icon: string; text: string }[] = [
  { key: 'worsening', icon: '📉', text: '加重' },
  { key: 'unchanged', icon: '➖', text: '无变化' },
  { key: 'improving', icon: '📈', text: '好转' },
  { key: 'recovered', icon: '✅', text: '恢复' }
];

const VAS_FACES = ['😌', '🙂', '😐', '😕', '😣', '😖', '😫', '😩', '😭', '💀', '💀'];

const PainPage: React.FC = () => {
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const [painLevel, setPainLevel] = useState(3);
  const [description, setDescription] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<any>('unchanged');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>([]);

  const { painRecords, addPainRecord } = useAppStore();

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const canSubmit = bodyPart !== null;

  const handleSubmit = () => {
    if (!bodyPart) {
      Taro.showToast({ title: '请选择疼痛部位', icon: 'none' });
      return;
    }
    addPainRecord({
      bodyPart,
      painLevel,
      description,
      recoveryStatus,
      triggers,
      measures
    });
    Taro.vibrateShort({ type: 'medium' });
    Taro.showToast({ title: '记录已保存', icon: 'success' });
    setBodyPart(null);
    setPainLevel(3);
    setDescription('');
    setRecoveryStatus('unchanged');
    setTriggers([]);
    setMeasures([]);
  };

  const avgPain = painRecords.length
    ? (painRecords.reduce((s, r) => s + r.painLevel, 0) / painRecords.length).toFixed(1)
    : 0;
  const improvingCount = painRecords.filter(r => r.recoveryStatus === 'improving' || r.recoveryStatus === 'recovered').length;

  const getPainColor = (l: number) => {
    if (l <= 3) return '#10B981';
    if (l <= 6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>📝 疼痛记录</Text>
        <Text className={styles.headerSubtitle}>记录每一次疼痛，追踪恢复状况，预防慢性损伤和重复伤害</Text>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{painRecords.length}</Text>
            <Text className={styles.statLabel}>总记录数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{avgPain}</Text>
            <Text className={styles.statLabel}>平均疼痛</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{improvingCount}</Text>
            <Text className={styles.statLabel}>好转次数</Text>
          </View>
        </View>
      </View>

      <View className={styles.formCard}>
        <View className={styles.formSection}>
          <Text className={styles.formLabel}>
            1. 疼痛部位
            <Text className={styles.formLabelHint}>（必选）</Text>
          </Text>
          <View className={styles.bodyGrid}>
            {BODY_PARTS.map(p => (
              <View
                key={p}
                className={classnames(styles.bodyItem, { [styles.selected]: bodyPart === p })}
                onClick={() => setBodyPart(p)}
              >
                {BODY_PART_NAMES[p]}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formLabel}>2. 疼痛程度（VAS评分）</Text>
          <View className={styles.vasScale}>
            <View className={styles.vasFace}>{VAS_FACES[painLevel]}</View>
            <Text className={styles.vasValue} style={{ color: getPainColor(painLevel) }}>{painLevel}</Text>
            <Text style={{ display: 'block', textAlign: 'center', fontSize: 26, color: getPainColor(painLevel), fontWeight: 600, marginTop: 8 }}>
              {getPainLevelText(painLevel)}
            </Text>
          </View>

          <Slider
            min={0}
            max={10}
            step={1}
            value={painLevel}
            activeColor={getPainColor(painLevel)}
            backgroundColor="#E2E8F0"
            blockColor={getPainColor(painLevel)}
            blockSize={32}
            onChange={(e) => setPainLevel(e.detail.value)}
          />

          <View className={styles.painLabels}>
            <Text className={styles.painLabel}>0 无痛</Text>
            <Text className={styles.painLabel}>5 较重</Text>
            <Text className={styles.painLabel}>10 最痛</Text>
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formLabel}>3. 恢复状态</Text>
          <View className={styles.statusGroup}>
            {STATUSES.map(s => (
              <View
                key={s.key}
                className={classnames(styles.statusItem, { [styles.selected]: recoveryStatus === s.key })}
                onClick={() => setRecoveryStatus(s.key)}
              >
                <Text className={styles.statusIcon}>{s.icon}</Text>
                <Text className={styles.statusText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formLabel}>4. 诱发因素（可多选）</Text>
          <View className={styles.checkGroup}>
            {TRIGGER_OPTIONS.map(opt => (
              <View
                key={opt}
                className={classnames(styles.checkItem, { [styles.selected]: triggers.includes(opt) })}
                onClick={() => toggleItem(opt, triggers, setTriggers)}
              >
                {opt}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formLabel}>5. 处理措施（可多选）</Text>
          <View className={styles.checkGroup}>
            {MEASURE_OPTIONS.map(opt => (
              <View
                key={opt}
                className={classnames(styles.checkItem, { [styles.selected]: measures.includes(opt) })}
                onClick={() => toggleItem(opt, measures, setMeasures)}
              >
                {opt}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formLabel}>6. 补充说明</Text>
          <Textarea
            className={styles.textArea}
            placeholder="请描述疼痛性质（刺痛/酸痛/胀痛）、持续时间、频率等详细信息..."
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
            maxlength={300}
          />
          <Text style={{ fontSize: 22, color: '#94A3B8', marginTop: 8, textAlign: 'right', display: 'block' }}>
            {description.length}/300
          </Text>
        </View>

        <View className={styles.btnRow}>
          <Button
            className={classnames(styles.btn, styles.secondary)}
            onClick={() => {
              setBodyPart(null); setPainLevel(3); setDescription('');
              setRecoveryStatus('unchanged'); setTriggers([]); setMeasures([]);
            }}
          >
            清空
          </Button>
          <Button
            className={classnames(styles.btn, styles.primary, { [styles.disabled]: !canSubmit })}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            💾 保存记录
          </Button>
        </View>
      </View>

      <View className={styles.historySection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📚 历史记录</Text>
          <Text className={styles.sectionCount}>共 {painRecords.length} 条</Text>
        </View>

        {painRecords.length > 0 ? (
          painRecords.map(r => <PainRecordCard key={r.id} record={r} />)
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>
              暂无疼痛记录{'\n'}
              科学记录是康复的第一步
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PainPage;
