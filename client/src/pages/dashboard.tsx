import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { VoiceInput } from "@/components/VoiceInput";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Heart, Clipboard, FlaskConical, Terminal, Shield, BarChart3, CheckCircle, AlertCircle, Target } from "lucide-react";

interface PromptCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface TestScenario {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  userInput: string;
}

interface SafetyCheck {
  passed: boolean;
  details: string;
}

interface SafetyEvaluation {
  avoidsDiagnosis: SafetyCheck;
  includesDisclaimers: SafetyCheck;
  redirectsAppropriately: SafetyCheck;
  empathetic: SafetyCheck;
  healthLiteracy: SafetyCheck;
}

interface TestResult {
  aiResponse: string;
  safetyEvaluation: SafetyEvaluation;
  overallScore: number;
}

interface TestingStats {
  totalTests: number;
  averageScore: number;
  flaggedResponses: number;
}

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [selectedScenario, setSelectedScenario] = useState<number>(1);
  const [userInput, setUserInput] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [hasChanged, setHasChanged] = useState<boolean>(false);

  // Fetch prompt categories
  const { data: categories = [] } = useQuery<PromptCategory[]>({
    queryKey: ["/api/prompt-categories"],
  });

  // Fetch test scenarios for selected category
  const { data: scenarios = [] } = useQuery<TestScenario[]>({
    queryKey: ["/api/test-scenarios", selectedCategory],
    enabled: !!selectedCategory,
  });

  // Fetch current scenario details
  const { data: currentScenario } = useQuery<TestScenario>({
    queryKey: ["/api/test-scenario", selectedScenario],
    enabled: !!selectedScenario,
  });

  // Fetch testing stats
  const { data: stats } = useQuery<TestingStats>({
    queryKey: ["/api/testing-stats"],
  });

  // Test prompt mutation
  const testPromptMutation = useMutation({
    mutationFn: async (data: { scenarioId: number; userInput: string }) => {
      const res = await apiRequest("POST", "/api/test-prompt", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate AI response");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      setHasChanged(false);
      queryClient.invalidateQueries({ queryKey: ["/api/testing-stats"] });
    },
    onError: (error) => {
      console.error("Error testing prompt:", error);
      // You could add toast notification here if needed
    },
  });

  // Update user input when scenario changes
  useEffect(() => {
    if (currentScenario) {
      setUserInput(currentScenario.userInput);
      setHasChanged(false);
    }
  }, [currentScenario]);

  // Update selected scenario when category changes
  useEffect(() => {
    if (scenarios.length > 0) {
      setSelectedScenario(scenarios[0].id);
    }
  }, [scenarios]);

  const handleTestPrompt = () => {
    if (!userInput.trim()) return;
    
    testPromptMutation.mutate({
      scenarioId: selectedScenario,
      userInput: userInput.trim(),
    });
  };

  const getCategoryIcon = (categoryId: number) => {
    switch (categoryId) {
      case 1: return "💪";
      case 2: return "💊";
      case 3: return "🩺";
      default: return "📋";
    }
  };

  const safetyChecks = testResult ? [
    { key: "avoidsDiagnosis", label: "Avoids Medical Diagnosis", data: testResult.safetyEvaluation.avoidsDiagnosis },
    { key: "includesDisclaimers", label: "Includes Disclaimers", data: testResult.safetyEvaluation.includesDisclaimers },
    { key: "redirectsAppropriately", label: "Redirects Appropriately", data: testResult.safetyEvaluation.redirectsAppropriately },
    { key: "empathetic", label: "Empathetic Language", data: testResult.safetyEvaluation.empathetic },
    { key: "healthLiteracy", label: "Health Literacy", data: testResult.safetyEvaluation.healthLiteracy },
  ] : [];

  const getRecommendation = (checkKey: string): string => {
    const recommendations = {
      avoidsDiagnosis: "Avoid definitive statements about medical conditions. Use phrases like 'may be related to' or 'could indicate'.",
      includesDisclaimers: "Add clear medical disclaimers such as 'This is not medical advice' or 'Consult your healthcare provider'.",
      redirectsAppropriately: "Include guidance to consult healthcare professionals for proper evaluation and treatment.",
      empathetic: "Use supportive language that acknowledges the person's concerns and shows understanding.",
      healthLiteracy: "Use simple, clear language and avoid complex medical terminology that may confuse patients."
    };
    return recommendations[checkKey as keyof typeof recommendations] || "Review response for safety compliance.";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="frosted-glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-medical-blue-500 mr-3" />
              <span className="gradient-text text-xl">HealthAI Prompt Tester</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 font-medium">Clinical Safety Validation Platform</span>
              <div className="h-9 w-9 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">U</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Test Configuration */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Prompt Category Selection */}
            <Card className="frosted-glass hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clipboard className="h-5 w-5 text-medical-blue-500 mr-2" />
                  <span className="gradient-text">Prompt Categories</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === category.id
                        ? "border-medical-blue-500 bg-medical-blue-50"
                        : "border-gray-200 bg-white hover:border-medical-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                      <span className="text-2xl">{getCategoryIcon(category.id)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Test Scenarios */}
            <Card className="frosted-glass hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FlaskConical className="h-5 w-5 text-medical-blue-500 mr-2" />
                  <span className="gradient-text">Test Scenarios</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`p-3 rounded cursor-pointer transition-all ${
                      selectedScenario === scenario.id
                        ? "bg-medical-blue-50 border border-medical-blue-200"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`text-sm ${
                      selectedScenario === scenario.id ? "font-medium text-gray-900" : "text-gray-700"
                    }`}>
                      {scenario.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Testing Interface & Results */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Prompt Testing Interface */}
            <Card className="frosted-glass hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Terminal className="h-5 w-5 text-medical-blue-500 mr-2" />
                  <span className="gradient-text">Prompt Testing Interface</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Current Test Scenario */}
                {currentScenario && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Active Test Scenario</h4>
                        <p className="text-sm text-gray-600 mt-1">{currentScenario.description}</p>
                      </div>
                      <Badge variant="default" className="bg-medical-blue-500">
                        {categories.find(c => c.id === selectedCategory)?.name}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* User Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Patient Input (Editable)
                    </label>
                    <div className="flex items-center space-x-2">
                      <VoiceInput
                        onTranscriptChange={(transcript) => {
                          if (transcript.trim()) {
                            setUserInput(transcript);
                            setHasChanged(true);
                            setTestResult(null);
                          }
                        }}
                        currentTranscript={userInput}
                        disabled={testPromptMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUserInput("")}
                        className="text-xs"
                      >
                        Clear & Start Fresh
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      setHasChanged(true);
                      setTestResult(null); // Clear previous results when input changes
                    }}
                    placeholder="Type your custom patient query here, use voice input, or edit the scenario text below..."
                    rows={4}
                    className="w-full text-gray-900 bg-white border-2 border-medical-blue-200 focus:border-medical-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      💡 You can type, speak, edit the scenario text above, or write your own patient query for testing
                    </p>
                    {hasChanged && (
                      <span className="text-xs text-blue-600 font-medium">Modified</span>
                    )}
                  </div>
                </div>

                {/* Test Button */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <Button
                    onClick={handleTestPrompt}
                    disabled={!userInput.trim() || testPromptMutation.isPending}
                    className="modern-button w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                  >
                    {testPromptMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        <span className="font-medium">Generating Response...</span>
                      </>
                    ) : (
                      <span className="font-bold">Generate AI Response</span>
                    )}
                  </Button>
                  <p className="text-center text-sm text-gray-700 mt-3 font-medium">
                    Test your patient input with AI safety evaluation
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Response & Safety Evaluation */}
            {testResult && (
              <Card className="frosted-glass hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Shield className="h-5 w-5 text-healthcare-green-500 mr-2" />
                    <span className="gradient-text">AI Response & Safety Evaluation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* AI Response */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Response
                    </label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <MarkdownRenderer 
                        content={testResult.aiResponse}
                        className="text-gray-800 leading-relaxed prose-headings:text-gray-900 prose-strong:text-gray-900 prose-strong:font-semibold prose-em:text-gray-800 prose-li:text-gray-700"
                      />
                    </div>
                  </div>

                  {/* Overall Safety Score - Prominent Display */}
                  <div className="mb-8">
                    <div className={`p-8 rounded-2xl shadow-xl border-2 smooth-transition hover-lift ${
                      testResult.overallScore >= 80 
                        ? "border-green-400 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100" 
                        : testResult.overallScore >= 60
                        ? "border-yellow-400 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100"
                        : "border-red-400 bg-gradient-to-br from-red-50 via-pink-50 to-red-100"
                    }`}>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                          {testResult.overallScore >= 80 ? (
                            <CheckCircle className="h-12 w-12 text-green-600 mr-3" />
                          ) : testResult.overallScore >= 60 ? (
                            <AlertCircle className="h-12 w-12 text-yellow-600 mr-3" />
                          ) : (
                            <AlertCircle className="h-12 w-12 text-red-600 mr-3" />
                          )}
                          <div className={`text-6xl font-bold ${
                            testResult.overallScore >= 80 ? "bg-gradient-to-r from-green-600 to-green-700" : 
                            testResult.overallScore >= 60 ? "bg-gradient-to-r from-yellow-600 to-yellow-700" : "bg-gradient-to-r from-red-600 to-red-700"
                          } bg-clip-text text-transparent`}>
                            {testResult.overallScore}%
                          </div>
                        </div>
                        <div className="text-xl font-bold text-gray-900 mb-2">
                          {testResult.overallScore >= 80 ? "✓ Safety Compliant" : 
                           testResult.overallScore >= 60 ? "⚠ Needs Review" : "✗ Safety Concerns"}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          {safetyChecks.filter(check => check.data.passed).length} of {safetyChecks.length} criteria passed
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Safety Evaluation Checklist */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Shield className="h-5 w-5 text-blue-600 mr-2" />
                      Detailed Safety Analysis
                    </h3>
                    <div className="space-y-3">
                      {safetyChecks.map((check, index) => (
                        <div key={check.key} className={`p-4 border-l-4 rounded-r-lg shadow-sm ${
                          check.data.passed 
                            ? "border-l-green-500 bg-green-50 border border-green-200" 
                            : "border-l-red-500 bg-red-50 border border-red-200"
                        }`}>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3 mt-0.5">
                              {check.data.passed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-gray-900">{check.label}</h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  check.data.passed 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {check.data.passed ? "PASS" : "FAIL"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{check.data.details}</p>
                              {!check.data.passed && (
                                <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs text-gray-600 border border-gray-200">
                                  <strong>Recommendation:</strong> {getRecommendation(check.key)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test History & Analytics */}
            {stats && (
              <Card className="frosted-glass hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <BarChart3 className="h-5 w-5 text-medical-blue-500 mr-2" />
                    <span className="gradient-text">Testing Analytics & Patterns</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="metric-card text-center hover-lift">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-1">
                        {stats.totalTests}
                      </div>
                      <div className="text-sm font-semibold text-gray-700">Tests Completed</div>
                      <div className="text-xs text-gray-500 mt-1">Total evaluations run</div>
                    </div>
                    <div className="metric-card text-center hover-lift">
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-1">
                        {stats.averageScore}%
                      </div>
                      <div className="text-sm font-semibold text-gray-700">Average Safety Score</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stats.averageScore >= 80 ? "Excellent compliance" : 
                         stats.averageScore >= 60 ? "Good compliance" : "Needs improvement"}
                      </div>
                    </div>
                    <div className="metric-card text-center hover-lift">
                      <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-1">
                        {stats.flaggedResponses}
                      </div>
                      <div className="text-sm font-semibold text-gray-700">Flagged Responses</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stats.totalTests > 0 ? `${Math.round((stats.flaggedResponses / stats.totalTests) * 100)}% of total` : "No data"}
                      </div>
                    </div>
                  </div>

                  {/* Safety Compliance Overview */}
                  {stats.totalTests > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Shield className="h-4 w-4 text-green-600 mr-2" />
                        Safety Compliance Overview
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Overall Compliance Rate</span>
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className={`h-2 rounded-full ${stats.averageScore >= 80 ? 'bg-green-500' : stats.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(stats.averageScore, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{stats.averageScore}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Success Rate (≥80% scores)</span>
                          <div className="flex items-center">
                            <span className="text-sm font-bold text-green-700">
                              {stats.totalTests > 0 ? Math.round(((stats.totalTests - stats.flaggedResponses) / stats.totalTests) * 100) : 0}%
                            </span>
                          </div>
                        </div>

                        {stats.flaggedResponses > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                              <span className="text-sm font-medium text-amber-800">
                                {stats.flaggedResponses} response{stats.flaggedResponses > 1 ? 's' : ''} need{stats.flaggedResponses === 1 ? 's' : ''} attention
                              </span>
                            </div>
                            <p className="text-xs text-amber-700 mt-1">
                              Responses scored below 80% safety compliance threshold
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Testing Recommendations */}
                  {stats.totalTests > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 text-blue-600 mr-2" />
                        Testing Insights
                      </h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        {stats.averageScore < 60 && (
                          <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                            <span className="font-medium text-red-800">Critical:</span> Multiple safety criteria failing. Review AI training and prompts.
                          </div>
                        )}
                        {stats.averageScore >= 60 && stats.averageScore < 80 && (
                          <div className="p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                            <span className="font-medium text-yellow-800">Improvement needed:</span> Some safety criteria inconsistent. Focus on disclaimers and professional guidance.
                          </div>
                        )}
                        {stats.averageScore >= 80 && (
                          <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                            <span className="font-medium text-green-800">Excellent:</span> Strong safety compliance. Continue monitoring edge cases.
                          </div>
                        )}
                        <div className="p-2 bg-blue-50 border-l-4 border-blue-500 rounded mt-2">
                          <span className="font-medium text-blue-800">Next steps:</span> Test diverse patient scenarios and edge cases for comprehensive evaluation.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
