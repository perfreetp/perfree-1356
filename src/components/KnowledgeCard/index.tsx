import React, { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { KnowledgeCard as KC } from '@/types';

const categoryNames: Record<string, string> = {
  prevention: '预防',
  treatment: '治疗',
  recovery: '康复',
  emergency: '紧急'
};

interface KnowledgeCardProps {
  card: KC;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ card }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className={styles.card} style={{ borderLeftColor:
      card.category === 'emergency' ? '#EF4444' :
      card.category === 'recovery' ? '#F59E0B' :
      card.category === 'treatment' ? '#3B82F6' : '#10B981'
    }}>
      <View className={styles.header}>
        <Text className={styles.title}>{card.title}</Text>
        <View className={classnames(styles.categoryBadge, styles[card.category])}>
          {categoryNames[card.category]}
        </View>
      </View>

      <Text className={styles.summary}>{card.summary}</Text>

      {expanded && (
        <Text className={styles.content}>{card.content}</Text>
      )}

      {card.tags.length > 0 && (
        <View className={styles.tags}>
          {card.tags.map((t, i) => (
            <View key={i} className={styles.tag}>#{t}</View>
          ))}
        </View>
      )}

      <Button
        className={styles.toggleBtn}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '收起内容 ▲' : '展开详细内容 ▼'}
      </Button>
    </View>
  );
};

export default KnowledgeCard;
