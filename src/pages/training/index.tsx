import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { TRAINING_PLANS, EMERGENCY_RULES } from '@/data/training';
import { useAppStore } from '@/store/app';

type PlanTab = 'rest' | 'alternative' | 'recovery';

const TABS: { key: PlanTab; name: string; icon: string }[] = [
  { key: 'rest', name: '休息建议', icon: '😴' },
  { key: 'alternative', name: '替代训练', icon: '🔄' },
  { key: 'recovery', name: '复训计划', icon: '💪' }
];

const TrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlanTab>('rest');
  const { reminders, toggleReminder, addReminder } = useAppStore();

  const filteredPlans = TRAINING_PLANS.filter(p => p.type === activeTab);

  const getIntensityTag = (i: string) => ({
    low: { text: '低强度', color: '#10B981', bg: '#ECFDF5' },
    medium: { text: '中强度', color: '#F59E0B', bg: '#FEF3C7' },
    high: { text: '高强度', color: '#EF4444', bg: '#FEE2E2' }
  }[i] || { text: i, color: '#64748B', bg: '#F1F5F9' });

  const handleUsePlan = (plan: any) => {
    Taro.showModal({
      title: '使用训练计划',
      content: `确定要将「${plan.title}」加入训练日程吗？系统将自动创建复训提醒。`,
      confirmText: '确认添加',
      confirmColor: '#F97316',
      success: (res) => {
        if (res.confirm) {
          addReminder({
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            title: plan.title,
            description: plan.description,
            type: 'recovery'
          });
          Taro.showToast({ title: '已加入计划', icon: 'success' });
          Taro.vibrateShort({ type: 'medium' });
        }
      }
    });
  };

  const handleEmergency = () => {
    Taro.makePhoneCall({ phoneNumber: '120' }).catch(() => {
      Taro.showToast({ title: '拨号取消', icon: 'none' });
    });
  };

  const today = new Date().toISOString().split('T')[0];
  const todayReminders = reminders.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>📋 智能训练计划</Text>
        <Text className={styles.headerSubtitle}>科学规划训练节奏，预防过度训练与运动损伤，帮助您安全进步</Text>
        <View className={styles.quickActions}>
          <View className={styles.quickBtn} onClick={() => setActiveTab('rest')}>
            <Text className={styles.quickBtnIcon}>🌴</Text>
            <Text className={styles.quickBtnText}>休息方案</Text>
          </View>
          <View className={styles.quickBtn} onClick={() => setActiveTab('alternative')}>
            <Text className={styles.quickBtnIcon}>♻️</Text>
            <Text className={styles.quickBtnText}>替代训练</Text>
          </View>
          <View className={styles.quickBtn} onClick={() => setActiveTab('recovery')}>
            <Text className={styles.quickBtnIcon}>🏥</Text>
            <Text className={styles.quickBtnText}>康复流程</Text>
          </View>
        </View>
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
                onClick={() => Taro.showToast({ title: '已查看详情', icon: 'none' })}
              >
                查看详情
              </Button>
              <Button
                className={classnames(styles.planBtn, styles.primary)}
                onClick={() => handleUsePlan(plan)}
              >
                使用此方案
              </Button>
            </View>
          </View>
        );
      })}

      <View className={styles.reminderSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🔔 复训提醒日程</Text>
          <View
            className={styles.addBtn}
            onClick={() => Taro.showToast({ title: '新建提醒功能开发中', icon: 'none' })}
          >
            + 新建
          </View>
        </View>

        {todayReminders.length > 0 ? todayReminders.map(r => (
          <View
            key={r.id}
            className={classnames(styles.reminderCard, { [styles.done]: r.done })}
            onClick={() => toggleReminder(r.id)}
          >
            <View className={styles.reminderCheck}>{r.done ? '✓' : ''}</View>
            <View className={styles.reminderContent}>
              <View className={styles.reminderDate}>
                <Text>📅 {r.date === today ? '今天' : r.date}</Text>
                <View className={classnames(styles.typeTag, styles[r.type])}>
                  {r.type === 'recovery' ? '康复训练' : r.type === 'training' ? '常规训练' : '检查评估'}
                </View>
              </View>
              <Text className={styles.reminderTitle}>{r.title}</Text>
              <Text className={styles.reminderDesc}>{r.description}</Text>
            </View>
          </View>
        )) : (
          <View style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 26, background: '#fff', borderRadius: 16, boxShadow: '0 2rpx 12rpx rgba(0,0,0,0.05)' }}>
            📭 暂无提醒，点击上方方案创建
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
