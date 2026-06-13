import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { SportType, BodyPart } from '@/types';
import { BODY_PART_NAMES, getSportTypeName } from '@/utils/risk';
import { WARMUP_ACTIONS } from '@/data/warmup';
import WarmupCard from '@/components/WarmupCard';

const SPORT_TABS: { type: SportType | 'all'; name: string; icon: string }[] = [
  { type: 'all', name: '全部', icon: '🎯' },
  { type: 'running', name: '跑步', icon: '🏃' },
  { type: 'ball', name: '球类', icon: '⚽' },
  { type: 'fitness', name: '健身', icon: '💪' }
];

const PART_FILTERS: BodyPart[] = ['knee', 'ankle', 'shoulder', 'waist', 'back', 'hip'];

const WarmupPage: React.FC = () => {
  const [activeSport, setActiveSport] = useState<SportType | 'all'>('all');
  const [activePart, setActivePart] = useState<BodyPart | 'all'>('all');

  const filteredActions = useMemo(() => {
    return WARMUP_ACTIONS.filter(a => {
      const sportMatch = activeSport === 'all' || a.sportTypes.includes(activeSport as SportType);
      const partMatch = activePart === 'all' || a.targetParts.includes(activePart);
      return sportMatch && partMatch;
    });
  }, [activeSport, activePart]);

  const totalTime = filteredActions.reduce((s, a) => s + a.duration, 0);
  const formatTotal = (s: number) => `${Math.floor(s / 60)}分${s % 60 ? (s % 60) + '秒' : ''}`;

  const handleStartAll = () => {
    Taro.showModal({
      title: '开始完整热身',
      content: `即将开始 ${filteredActions.length} 个热身动作，预计 ${formatTotal(totalTime)}。是否开始？`,
      confirmText: '开始热身',
      confirmColor: '#10B981',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '热身模式启动', icon: 'success' });
          Taro.vibrateShort({ type: 'light' });
        }
      }
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>🔥 热身动作库</Text>
        <Text className={styles.headerSubtitle}>科学的热身可以降低50%以上的运动损伤风险</Text>
        <View className={styles.headerTips}>
          📌 运动前请预留 10-15 分钟进行完整热身，每个动作达到微微出汗、肌肉发热的状态最佳
        </View>
      </View>

      <View className={styles.tabBar}>
        {SPORT_TABS.map(tab => (
          <View
            key={tab.type}
            className={classnames(styles.tabItem, { [styles.active]: activeSport === tab.type })}
            onClick={() => { setActiveSport(tab.type); Taro.vibrateShort({ type: 'light' }); }}
          >
            {tab.icon} {tab.name}
          </View>
        ))}
      </View>

      <View className={styles.filterBar}>
        <View
          className={classnames(styles.filterTag, { [styles.active]: activePart === 'all' })}
          onClick={() => setActivePart('all')}
        >
          全部部位
        </View>
        {PART_FILTERS.map(p => (
          <View
            key={p}
            className={classnames(styles.filterTag, { [styles.active]: activePart === p })}
            onClick={() => setActivePart(p)}
          >
            {BODY_PART_NAMES[p]}
          </View>
        ))}
      </View>

      <View className={styles.summaryBar}>
        <View className={styles.summaryItem}>
          <Text className={styles.summaryNum}>{filteredActions.length}</Text>
          <Text className={styles.summaryLabel}>动作数量</Text>
        </View>
        <View className={styles.summaryItem}>
          <Text className={styles.summaryNum}>{formatTotal(totalTime)}</Text>
          <Text className={styles.summaryLabel}>预计时长</Text>
        </View>
        <View className={styles.summaryItem}>
          <Text className={styles.summaryNum}>{new Set(filteredActions.flatMap(a => a.targetParts)).size}</Text>
          <Text className={styles.summaryLabel}>覆盖部位</Text>
        </View>
      </View>

      <View className={styles.sectionTitle}>
        <Text className={styles.sectionTitleText}>
          📋 {activeSport === 'all' ? '全部' : getSportTypeName(activeSport)}热身动作
        </Text>
        <View className={styles.sectionCount}>{filteredActions.length} 个</View>
      </View>

      {filteredActions.length > 0 ? (
        filteredActions.map((action, i) => (
          <View key={action.id}>
            {i === 0 && (
              <View style={{
                padding: '12rpx 24rpx', background: '#10B981', color: '#fff',
                borderRadius: '12rpx 12rpx 0 0', fontSize: 24, fontWeight: 500,
                display: 'inline-block', marginBottom: -12
              }}>
                第 {i + 1} 个动作 · 推荐顺序
              </View>
            )}
            <WarmupCard action={action} />
          </View>
        ))
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🤷</Text>
          <Text className={styles.emptyText}>
            当前筛选条件下暂无匹配动作{'\n'}
            试试更换运动类型或部位筛选
          </Text>
        </View>
      )}

      {filteredActions.length > 0 && (
        <Button className={styles.startAllBtn} onClick={handleStartAll}>
          🚀 一键开始全部热身 ({formatTotal(totalTime)})
        </Button>
      )}
    </ScrollView>
  );
};

export default WarmupPage;
