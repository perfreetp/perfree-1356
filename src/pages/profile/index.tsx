import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '@/store/app';
import { KNOWLEDGE_CARDS } from '@/data/knowledge';
import KnowledgeCard from '@/components/KnowledgeCard';
import { getSportTypeName } from '@/utils/risk';
import { EMERGENCY_RULES } from '@/data/training';

type KnowledgeCat = 'all' | 'prevention' | 'treatment' | 'recovery' | 'emergency';

const CATS: { key: KnowledgeCat; name: string }[] = [
  { key: 'all', name: '全部' },
  { key: 'prevention', name: '预防' },
  { key: 'treatment', name: '治疗' },
  { key: 'recovery', name: '康复' },
  { key: 'emergency', name: '急救' }
];

const ProfilePage: React.FC = () => {
  const { userProfile, assessments, painRecords, getWeeklyTrend } = useAppStore();
  const [cat, setCat] = useState<KnowledgeCat>('all');

  const trend = getWeeklyTrend();
  const maxRisk = Math.max(...trend.map(t => t.riskScore), 50);
  const maxPain = Math.max(...trend.map(t => t.painCount), 1);

  const filteredCards = useMemo(() => {
    return cat === 'all' ? KNOWLEDGE_CARDS : KNOWLEDGE_CARDS.filter(c => c.category === cat);
  }, [cat]);

  const totalTrainHours = assessments.length * 1.5 + painRecords.length;
  const recoveryRate = painRecords.length
    ? Math.round(painRecords.filter(r => r.recoveryStatus === 'recovered' || r.recoveryStatus === 'improving').length / painRecords.length * 100)
    : 0;

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

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.profileCard}>
        <View className={styles.profileTop}>
          <View className={styles.avatar}>
            {userProfile.gender === 'female' ? '👩' : userProfile.gender === 'other' ? '🧑' : '👨'}
          </View>
          <View className={styles.info}>
            <Text className={styles.userName}>{userProfile.name}</Text>
            <Text className={styles.userSport}>
              🏆 主项：{getSportTypeName(userProfile.mainSport)} · 每周{userProfile.trainingFrequency}次
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
            <Text className={styles.bioNum}>{Math.round(userProfile.weight / Math.pow(userProfile.height / 100, 2))}</Text>
            <Text className={styles.bioLabel}>BMI</Text>
          </View>
        </View>

        <View
          className={styles.editBtn}
          onClick={() => Taro.showToast({ title: '资料编辑开发中', icon: 'none' })}
        >
          ✏️ 编辑个人资料
        </View>
      </View>

      <View className={styles.sectionCard}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📊</Text>
            <Text>本周趋势周报</Text>
          </View>
          <Text className={styles.moreBtn}>查看详情 →</Text>
        </View>

        <View className={styles.trendChart}>
          <Text style={{ fontSize: 26, color: '#64748B', marginBottom: 16, display: 'block' }}>
            风险评分 & 疼痛次数（近7天）
          </Text>
          <View className={styles.trendRow}>
            {trend.map((t, i) => (
              <View key={i} className={styles.trendBarWrap}>
                <View style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
                  <View
                    className={classnames(styles.trendBar, styles.risk)}
                    style={{ height: `${(t.riskScore / maxRisk) * 160 + 4}rpx` }}
                  />
                  <View
                    className={styles.trendBar}
                    style={{ height: `${(t.painCount / maxPain) * 80 + 2}rpx` }}
                  />
                </View>
                <Text className={styles.trendLabel}>{t.date}</Text>
              </View>
            ))}
          </View>
          <View className={styles.trendLegend}>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#F59E0B' }} />
              <Text>风险评分</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={styles.legendDot} style={{ background: '#10B981' }} />
              <Text>疼痛次数</Text>
            </View>
          </View>
        </View>

        <View className={styles.statsGrid}>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{assessments.length}</Text>
            <Text className={styles.statLabel}>风险评估</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{painRecords.length}</Text>
            <Text className={styles.statLabel}>疼痛记录</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{totalTrainHours.toFixed(1)}h</Text>
            <Text className={styles.statLabel}>训练时长</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{recoveryRate}%</Text>
            <Text className={styles.statLabel}>好转率</Text>
          </View>
        </View>
      </View>

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
              className={classnames(cat === c.key ? styles.active : '', styles.catTab)}
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

      <View style={{ textAlign: 'center', padding: '32rpx 0', color: '#94A3B8', fontSize: 22 }}>
        运动损伤预防 v1.0.0{'\n'}
        ⚠️ 本小程序仅供参考，严重损伤请及时就医
      </View>
    </ScrollView>
  );
};

export default ProfilePage;
