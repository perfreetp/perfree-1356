import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { WarmupAction } from '@/types';
import { BODY_PART_NAMES } from '@/utils/risk';

interface WarmupCardProps {
  action: WarmupAction;
  showTimer?: boolean;
}

const WarmupCard: React.FC<WarmupCardProps> = ({ action, showTimer = true }) => {
  const [timeLeft, setTimeLeft] = useState(action.duration);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(action.duration);
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [action.id, action.duration]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            Taro.vibrateShort({ type: 'medium' });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(action.duration);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(action.duration);
  };

  return (
    <View className={styles.card}>
      <View className={styles.cardHeader}>
        <Text className={styles.actionName}>{action.name}</Text>
        <View className={styles.durationBadge}>{action.duration}秒</View>
      </View>

      <Text className={styles.desc}>{action.description}</Text>

      <View style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        {action.targetParts.map(p => (
          <View key={p} style={{
            padding: '6rpx 20rpx',
            background: '#F1F5F9',
            borderRadius: 8,
            fontSize: 22,
            color: '#64748B'
          }}>
            {BODY_PART_NAMES[p]}
          </View>
        ))}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon} style={{ background: '#10B981' }}>步</View>
          <Text>动作步骤</Text>
        </View>
        <View className={styles.stepList}>
          {action.steps.map((s, i) => (
            <Text key={i} className={styles.stepItem}>{i + 1}. {s}</Text>
          ))}
        </View>
      </View>

      {action.mistakes.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionTitle}>
            <View className={styles.sectionIcon} style={{ background: '#EF4444' }}>错</View>
            <Text>错误姿势提醒</Text>
          </View>
          {action.mistakes.map((m, i) => (
            <View key={i} className={styles.mistakeItem}>⚠ {m}</View>
          ))}
        </View>
      )}

      {action.tips.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionTitle}>
            <View className={styles.sectionIcon} style={{ background: '#3B82F6' }}>提</View>
            <Text>要点提示</Text>
          </View>
          {action.tips.map((t, i) => (
            <View key={i} className={styles.tipItem}>💡 {t}</View>
          ))}
        </View>
      )}

      {showTimer && (
        <View className={styles.timerWrap}>
          <Text style={{ fontSize: 24, color: '#64748B' }}>拉伸计时器</Text>
          <View className={styles.timeDisplay}>{formatTime(timeLeft)}</View>
          <View className={styles.buttonRow}>
            <Button
              className={classnames(styles.btn, styles.primary)}
              onClick={toggleTimer}
            >
              {timeLeft === 0 ? '重新开始' : isRunning ? '暂停' : '开始计时'}
            </Button>
            <Button
              className={classnames(styles.btn, styles.secondary)}
              onClick={resetTimer}
            >
              重置
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

export default WarmupCard;
